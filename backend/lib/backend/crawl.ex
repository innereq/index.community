defmodule Backend.Crawl do
  @moduledoc """
  Stores aggregate data about a single crawl (i.e. not individual statuses, but the number of statuses seen etc.)
  """
  use Ecto.Schema
  import Ecto.Changeset

  schema "crawls" do
    belongs_to :instance, Backend.Instance,
      references: :domain,
      type: :string,
      foreign_key: :instance_domain

    field :interactions_seen, :integer
    field :statuses_seen, :integer

    timestamps()
  end

  @doc false
  def changeset(crawl, attrs) do
    crawl
    |> cast(attrs, [:instance, :statuses_seen, :interactions_seen])
    |> validate_required([:instance])
  end
end
