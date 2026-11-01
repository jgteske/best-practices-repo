variable "server_name" {
  type    = string
  default = "coolify-1"
}

variable "server_type" {
  type    = string
  default = "cx33"
}

variable "location" {
  type    = string
  default = "fsn1"
}

variable "ssh_public_key" {
  type        = string
  description = "Public key installed for root at first boot."
}

# region admin-cidrs
variable "admin_cidrs" {
  type        = list(string)
  description = "Networks allowed to reach SSH, e.g. your home IP as x.x.x.x/32."

  validation {
    condition = (
      length(var.admin_cidrs) > 0 &&
      !contains(var.admin_cidrs, "0.0.0.0/0") &&
      !contains(var.admin_cidrs, "::/0")
    )
    error_message = "List at least one network, and don't open SSH to the whole internet."
  }
}
# endregion admin-cidrs

variable "expose_setup_port" {
  type        = bool
  description = "Opens Coolify's port 8000 to admin_cidrs. Turn off once the dashboard has a domain."
  default     = false
}
