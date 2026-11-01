# Configuring with Ansible

Ansible connects over SSH and brings the server to a described state. It needs
no agent on the server, just Python, which is why cloud-init installs it.

The files are in
[`examples/servers/ansible`](https://github.com/jgteske/best-practices-repo/tree/main/examples/servers/ansible).

## Layout

```text
ansible/
├── ansible.cfg
├── site.yml                 # which roles run on which hosts
├── inventory/
│   ├── production.yml       # the servers
│   └── group_vars/all/      # their settings, and the encrypted vault.yml
└── roles/
    ├── base/                # admin user, patching
    ├── ssh_hardening/
    └── coolify/
```

<<< ../../examples/servers/ansible/site.yml{yaml}

## Idempotence is the point

Running a playbook twice should change nothing the second time. That property
makes it safe to re-run after a failure, and it's what makes drift detection
possible: any reported change means the server differs from Git.

- Prefer a module that describes state over `command` or `shell`.
- If you must use `command`, tell Ansible when it's already done, with `creates:`.
- Use handlers to reload services only when their config really changed.
- Preview with `ansible-playbook site.yml --check --diff`.

## Create your access before you restrict it

The order of these roles matters. Lockouts usually happen when SSH is restricted
before a working login exists. The `base` role runs first, and refuses to run
without a key:

<<< ../../examples/servers/ansible/roles/base/tasks/main.yml#admin-user{yaml}

Writing `authorized_keys` as a whole file means that removing a key from Git
removes its access from the server. The `validate:` line checks the new sudoers
file before it replaces the old one.

## SSH hardening without a lockout

<<< ../../examples/servers/ansible/roles/ssh_hardening/tasks/main.yml#sshd{yaml}

A few details here prevent real problems:

- **`validate:`** rejects a config that doesn't parse. It can't catch a config
  that's valid but locks you out.
- **Reload, not restart**, and keep your current session open until a *new*
  login works.
- **`PermitRootLogin prohibit-password`** is what
  [Coolify's OpenSSH guide](https://coolify.io/docs/knowledge-base/server/openssh)
  recommends. Coolify logs in to its own host as root with a key, so hardening
  guides that say `no` would break it.
- **Moving SSH to another port** doesn't add real security. Restricting who can
  reach port 22 in the firewall does.

## Automatic security patches

<<< ../../examples/servers/ansible/roles/base/tasks/main.yml#patching{yaml}

Unpatched servers are a bigger everyday risk than most configuration details, so
automate this and choose a reboot time you can accept. fail2ban cuts log noise
from password-guessing bots. With password logins disabled and SSH firewalled,
it's a second layer rather than your main defence.

## Secrets with Ansible Vault

Keep secrets in an encrypted file, and commit that file:

```bash
ansible-vault create inventory/group_vars/all/vault.yml
ansible-playbook site.yml --ask-vault-pass
```

- Set `no_log: true` on tasks that handle secrets, so they stay out of CI logs.
- Store the vault password in your password manager and in a CI secret.
- A leaked vault password exposes the file's whole Git history, so rotate the
  secrets as well as the password.

## Rules of thumb

- Use `ansible.builtin` modules first. Every extra collection is another dependency to pin.
- Prefix role variables with the role's name. `ansible-lint` enforces this, and it prevents collisions.
- Run `ansible-lint` in CI, and `--check --diff` before every real run.
- Change servers only through the playbook, and run it against one server first when you have several.
