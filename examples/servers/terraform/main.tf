resource "hcloud_ssh_key" "admin" {
  name       = "${var.server_name}-admin"
  public_key = var.ssh_public_key
}

# region firewall
# A provider firewall filters traffic before it reaches the server, so Docker's
# iptables rules can't bypass it the way they can bypass UFW.
resource "hcloud_firewall" "web" {
  name = "${var.server_name}-web"

  rule {
    description = "SSH from admin networks only"
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = var.admin_cidrs
  }

  rule {
    description = "HTTP"
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }

  rule {
    description = "HTTPS"
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }

  dynamic "rule" {
    for_each = var.expose_setup_port ? [1] : []

    content {
      description = "Coolify dashboard during first setup"
      direction   = "in"
      protocol    = "tcp"
      port        = "8000"
      source_ips  = var.admin_cidrs
    }
  }
}
# endregion firewall

# region server
resource "hcloud_server" "coolify" {
  name         = var.server_name
  server_type  = var.server_type
  image        = "ubuntu-24.04"
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.admin.id]
  firewall_ids = [hcloud_firewall.web.id]
  backups      = true
  user_data    = file("${path.module}/cloud-init.yaml")

  lifecycle {
    # This server holds data. Replacing it should take a deliberate code change.
    prevent_destroy = true
    # These only apply at creation. A change here must not rebuild a running server.
    ignore_changes = [image, ssh_keys, user_data]
  }
}
# endregion server
