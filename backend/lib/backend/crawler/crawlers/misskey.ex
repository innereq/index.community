defmodule Backend.Crawler.Crawlers.Misskey do
  alias Backend.Crawler.ApiCrawler

  @behaviour ApiCrawler
  import Backend.Crawler.Util
  import Backend.Util
  require Logger

  @impl ApiCrawler
  def is_instance_type?(domain) do
    case get_version_and_description(domain) do
      {:ok, _} -> true
      {:error, _} -> false
    end
  end

  @impl ApiCrawler
  def allows_crawling?(domain) do
    [
      "/api/meta",
      "/api/stats",
      "/api/notes/local-timeline",
      "/api/v1/instance/peers"
    ]
    |> Enum.map(fn endpoint -> "https://#{domain}#{endpoint}" end)
    |> urls_are_crawlable?()
  end

  @impl ApiCrawler
  def crawl(domain) do
    with {:ok, %{status_code: 200, body: stats_body}} <- post("https://#{domain}/api/stats") do
      %{"originalUsersCount" => user_count, "originalNotesCount" => status_count} =
        Jason.decode!(stats_body)

      if is_above_user_threshold?(user_count) or has_opted_in?(domain) do
        crawl_large_instance(domain, user_count, status_count)
      else
        %{
          version: nil,
          description: nil,
          user_count: user_count,
          status_count: nil,
          peers: [],
          interactions: %{},
          statuses_seen: 0,
          instance_type: nil
        }
      end
    end
  end

  @spec crawl_large_instance(String.t(), integer(), integer()) :: ApiCrawler.t()
  defp crawl_large_instance(domain, user_count, status_count) do
    status_datetime_threshold =
      NaiveDateTime.utc_now()
      |> NaiveDateTime.add(get_config(:status_age_limit_days) * 24 * 3600 * -1, :second)

    # Don't get any statuses older than this
    min_timestamp =
      max_datetime(get_last_successful_crawl_timestamp(domain), status_datetime_threshold)

    {interactions, statuses_seen} = get_interactions(domain, min_timestamp)
    {:ok, {version, description}} = get_version_and_description(domain)
    {:ok, peers} = get_peers(domain)

    %{
      instance_type: :misskey,
      # From stats endpoint
      user_count: user_count,
      status_count: status_count,
      # From meta endpoint
      version: version,
      description: description,
      # From timeline
      interactions: interactions,
      statuses_seen: statuses_seen,
      # From peers endpoint
      peers: peers
    }
  end

  @spec get_interactions(
          String.t(),
          NaiveDateTime.t(),
          String.t() | nil,
          ApiCrawler.instance_interactions(),
          integer()
        ) :: {ApiCrawler.instance_interactions(), integer()}
  defp get_interactions(
         domain,
         min_timestamp,
         until_id \\ nil,
         interactions \\ %{},
         statuses_seen \\ 0
       ) do
    endpoint = "https://#{domain}/api/notes/local-timeline"

    params = %{
      limit: 20
    }

    params =
      if until_id != nil do
        Map.put(params, :untilId, until_id)
      else
        params
      end

    Logger.debug("Crawling #{endpoint} with untilId=#{until_id}")

    statuses =
      endpoint
      |> post!(Jason.encode!(params))
      |> Map.get(:body)
      |> Jason.decode!()

    filtered_statuses =
      statuses
      |> Enum.filter(fn s -> is_after?(s["createdAt"], min_timestamp) end)

    if length(filtered_statuses) > 0 do
      # get statuses that are eligible (i.e. users don't have #nobot in their profile) and have mentions
      interactions =
        filtered_statuses
        |> statuses_to_interactions()
        |> merge_count_maps(interactions)

      # Don't count renotes in the # of statuses seen
      statuses_seen =
        filtered_statuses
        |> Enum.filter(&is_original_status?(&1))
        |> Kernel.length()
        |> Kernel.+(statuses_seen)

      oldest_status = Enum.at(filtered_statuses, -1)

      oldest_status_datetime =
        oldest_status
        |> (fn s -> s["createdAt"] end).()
        |> NaiveDateTime.from_iso8601!()

      if NaiveDateTime.compare(oldest_status_datetime, min_timestamp) == :gt and
           statuses_seen < get_config(:status_count_limit) and
           length(filtered_statuses) == length(statuses) do
        get_interactions(domain, min_timestamp, oldest_status["id"], interactions, statuses_seen)
      else
        {interactions, statuses_seen}
      end
    else
      {interactions, statuses_seen}
    end
  end

  @spec get_version_and_description(String.t()) ::
          {:ok, {String.t(), String.t()}} | {:error, String.t()}
  defp get_version_and_description(domain) do
    case post("https://#{domain}/api/meta") do
      {:ok, %{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, decoded} ->
            {:ok, {Map.get(decoded, "version"), Map.get(decoded, "description")}}

          {:error, _error} ->
            {:error, "invalid response"}
        end

      _ ->
        {:error, "unsuccesful request"}
    end
  end

  @spec get_peers(String.t()) :: {:ok, [String.t()]} | {:error, Jason.DecodeError.t()}
  defp get_peers(domain) do
    case get("https://#{domain}/api/v1/instance/peers") do
      {:ok, response} ->
        with %{status_code: 200, body: body} <- response do
          Jason.decode(body)
        else
          _ -> {:ok, []}
        end

      {:error, _} ->
        {:ok, []}
    end
  end

  @spec statuses_to_interactions(any()) :: ApiCrawler.instance_interactions()
  defp statuses_to_interactions(statuses) do
    statuses
    |> Enum.filter(fn status -> is_mention?(status) end)
    |> Enum.map(fn status -> extract_mentions_from_status(status) end)
    |> Enum.reduce(%{}, fn map, acc ->
      Map.merge(acc, map)
    end)
  end

  # Checks whether
  # * it's not a renote (a.k.a. a boost)
  # * the status contains one or more mentions
  @spec is_mention?(any()) :: boolean()
  defp is_mention?(status) do
    has_mentions = Map.get(status, "mentions") != nil
    is_original_status?(status) and has_mentions
  end

  # Checks whether it's not a renote (a.k.a. a boost)
  @spec is_original_status?(any()) :: boolean()
  defp is_original_status?(status) do
    Map.get(status, "renoteId") == nil
  end

  @spec extract_mentions_from_status(any()) :: ApiCrawler.instance_interactions()
  defp extract_mentions_from_status(status) do
    status_content = Map.get(status, "text")

    Regex.scan(~r/@\w+@([\w.-]+)/, status_content)
    |> Enum.map(fn [_match, domain] -> domain end)
    |> Enum.reduce(%{}, fn domain, acc ->
      Map.update(acc, domain, 1, &(&1 + 1))
    end)
  end
end