# Works with Terraform and OpenTofu. >= 1.10 is what `use_lockfile` in backend.hcl needs.
terraform {
  required_version = ">= 1.10"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.70"
    }
  }

  # Settings live in backend.hcl: tofu init -backend-config=backend.hcl
  backend "s3" {}
}

# The token comes from the HCLOUD_TOKEN environment variable, never from a file.
provider "hcloud" {}
