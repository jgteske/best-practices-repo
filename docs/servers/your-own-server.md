# Running Your Own Server

This walkthrough goes from an empty cloud account to an app deployed by CI, using
the other pages' examples. Copy
[`examples/servers`](https://github.com/jgteske/best-practices-repo/tree/main/examples/servers)
into your repository as `infra/`, then replace the example values.

::: tip Start small
Do steps 1 to 4 by running the commands from your laptop. Automate them with step 6
only once they've worked by hand.
:::

## What you need

- A Hetzner Cloud project and API token, or the equivalent at your provider
- A domain whose DNS you control
- A private, versioned bucket for Terraform state
- S3-compatible storage for backups, ideally with a different provider
- An SSH key, and a password manager

## 1. Create the server

```bash
cd infra/terraform
export HCLOUD_TOKEN=...                # read from your password manager
export AWS_ACCESS_KEY_ID=...           # for the state bucket
export AWS_SECRET_ACCESS_KEY=...
export TF_VAR_ssh_public_key="$(cat ~/.ssh/id_ed25519.pub)"
export TF_VAR_admin_cidrs="[\"$(curl -s https://ifconfig.me)/32\"]"
export TF_VAR_expose_setup_port=true   # for first-time setup only

tofu init -backend-config=backend.hcl
tofu plan -out=tfplan                  # read it
tofu apply tfplan
```

This assumes your IP address is IPv4. Note the `server_ipv4` output, and put it in
`ansible/inventory/production.yml`.

Compare the host key against the one in your provider's console if you can, because
this first connection is when you decide to trust it:

```bash
ssh root@<server_ipv4> 'exit'
```

## 2. Configure the server

Update `group_vars/all/main.yml` with your SSH key, and create a vault with the
Coolify admin password and email:

```bash
cd ../ansible
ansible-vault create inventory/group_vars/all/vault.yml
```

Add these to the vault file, with your own values. A long, generated password is
best:

```yaml
coolify_root_email: you@example.com
coolify_root_password: use-a-generated-password
```

The admin user doesn't exist yet, so the first run connects as root:

```bash
ansible-playbook site.yml --ask-vault-pass -e ansible_user=root
```

**In a new terminal, confirm that a new login works** before closing your session:

```bash
ssh admin@<server_ipv4> 'sudo whoami'    # prints: root
ssh -o PubkeyAuthentication=no root@<server_ipv4>   # must be refused
```

## 3. Finish setting up Coolify

1. Open `http://<server_ipv4>:8000`, and log in with the account from your vault.
2. Point DNS records at the server: one for the dashboard, and a wildcard for apps
   if you want generated subdomains.
3. Set the instance domain, then turn on two-factor authentication.
4. Confirm that the dashboard, live updates and terminal all work over HTTPS.
5. Close the setup port:

```bash
cd ../terraform
export TF_VAR_expose_setup_port=false
tofu apply
```

Then, from a machine outside the server, confirm that only the expected ports answer:

```bash
nmap -Pn -p 22,80,443,5432,6001,6002,8000 <server_ipv4>
```

## 4. Set up backups, before you have data to lose

1. Save `APP_KEY` in your password manager
   ([command](./operations#backups)).
2. Add your S3 storage in Coolify, then enable instance backups and backups for each
   database.
3. Run one backup, and confirm that the file arrives in the bucket.
4. Add an external uptime monitor, and a Coolify notification channel.

## 5. Deploy an app

Create a project in Coolify, add a resource, and choose
[a build method](./coolify#choosing-how-an-app-gets-built). Set your domain and
environment variables, then deploy. Visit the app over HTTPS, and reboot the server
once to confirm that it comes back by itself.

## 6. Hand it over to CI

1. Install Tailscale on the server and join your tailnet:

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sudo sh
   sudo tailscale up
   ```

2. Change `ansible_host` to the server's Tailscale name. Save its host key for the
   `SSH_KNOWN_HOSTS` variable by running `ssh-keyscan` over the tailnet, from a
   machine you already trust.
3. Copy the [workflows](./automation), and create the `production` and `drift`
   environments with [their credentials](./automation#credentials).
4. Commit `.terraform.lock.hcl`, protect `main`, and require the checks to pass.
5. Make a harmless change through a pull request, like adding a comment to a role,
   and watch it go all the way through.

From now on, don't change the server by hand. If an emergency forces you to, put the
change into Git afterwards.

## Checklist

**Access**

- [ ] Password SSH logins are refused, and SSH is reachable only from known networks
- [ ] You've tested your provider's web console
- [ ] Two-factor is on for the dashboard, cloud account, registrar and GitHub

**Network**

- [ ] An external scan shows only the expected ports
- [ ] No database publishes a port
- [ ] Coolify's setup ports are closed

**Data**

- [ ] `APP_KEY` is stored off the server
- [ ] Database, volume and Coolify backups all arrive off-site
- [ ] You've completed a real restore

**Operations**

- [ ] Security updates and reboots are automatic, and apps survive a reboot
- [ ] Alerts for uptime, disk and backups have been tested
- [ ] All changes go through pull requests, and drift detection is scheduled

## Rebuilding from scratch

Keep a copy of this runbook outside the server, along with your password manager
access. Assuming the server is gone:

1. **Remove the old server from state**, since it no longer exists. `prevent_destroy`
   would otherwise block replacing a server that's still recorded:
   `tofu state rm hcloud_server.coolify`
2. **Create a new one**, with the setup port open: `tofu apply`
3. **Update the inventory** with the new address, and update `SSH_KNOWN_HOSTS`,
   because the host key has changed.
4. **Run Ansible** as root, as in [step 2](#_2-configure-the-server). This installs
   the pinned Coolify version.
5. **Restore Coolify** by following its
   [restore guide](https://coolify.io/docs/core/backup-and-recovery/instance-restore):
   load the database backup, then put your saved key into the `APP_KEY` line of the
   new `.env`. Keep the rest of that file, because values like `DB_PASSWORD` must
   match the new containers.
6. **Restore SSH access for Coolify** from your copy of `/data/coolify/ssh/keys/`, and
   check that **Servers → localhost** validates.
7. **Restore app data**, from database backups and volume backups. They aren't part
   of the instance restore.
8. **Update DNS** if the address changed, and close the setup port.
9. **Write down** what the runbook missed and how long it took.

Practice this on a throwaway server. Your first attempt shouldn't be during a real
outage.
