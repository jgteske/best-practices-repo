# State can hold secrets: keep the bucket private, versioned and encrypted.
bucket       = "example-terraform-state"
key          = "servers/production.tfstate"
region       = "eu-central-1"
encrypt      = true
use_lockfile = true
