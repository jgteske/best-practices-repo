output "server_ipv4" {
  description = "Public IPv4 address, for DNS and the Ansible inventory."
  value       = hcloud_server.coolify.ipv4_address
}
