defmodule Backend.Instance do
  @moduledoc """
  Model for storing everything related to an instance: not only the data from crawls, but also statistics, the time
  of the next scheduled crawl, X and Y coordinates on the graph, and so on.
  """
  use Ecto.Schema
  import Ecto.Changeset

  schema "instances" do
    field :domain, :string
    field :description, :string
    field :user_count, :integer
    field :status_count, :integer
    field :version, :string
    field :insularity, :float
    field :type, :string
    field :statuses_per_day, :float
    field :base_domain, :string
    field :opt_in, :boolean
    field :opt_out, :boolean
    field :next_crawl, :naive_datetime
    field :crawl_error, :string
    field :crawl_error_count, :integer

    many_to_many :peers, Backend.Instance,
      join_through: Backend.InstancePeer,
      join_keys: [source_domain: :domain, target_domain: :domain]

    # This may look like it's duplicating :peers above, but it allows us to insert peer relationships quickly.
    # https://stackoverflow.com/a/56764241/3697202
    has_many :instance_peers, Backend.InstancePeer,
      foreign_key: :source_domain,
      references: :domain

    has_many :federation_restrictions, Backend.FederationRestriction,
      foreign_key: :source_domain,
      references: :domain

    timestamps()
  end

  @doc false
  def changeset(instance, attrs) do
    instance
    |> cast(attrs, [
      :domain,
      :description,
      :user_count,
      :status_count,
      :version,
      :insularity,
      :updated_at,
      :type,
      :statuses_per_day,
      :base_domain,
      :opt_in,
      :opt_out,
      :next_crawl,
      :crawl_error,
      :crawl_error_count
    ])
    |> validate_required([:domain])
    |> put_assoc(:peers, attrs.peers)
  end

  defimpl Elasticsearch.Document, for: Backend.Instance do
    def id(instance), do: instance.id
    def routing(_), do: false

    def encode(instance) do
      # Make sure this corresponds with priv/elasticseach/instances.json
      %{
        domain: instance.domain,
        description: instance.description,
        type: instance.type,
        user_count: instance.user_count,
        opt_out: instance.opt_out
      }
    end
  end
end
