# Servers Cheat Sheet

One-line reminders, grouped by task. Follow the links for the full explanation.

## Terraform / OpenTofu: [details](./terraform)

```bash
tofu init -backend-config=backend.hcl    # first run, or after changing providers
tofu fmt -recursive && tofu validate     # tidy and check
tofu plan -out=tfplan                    # read it, and look for "must be replaced"
tofu apply tfplan                        # apply exactly what you reviewed
tofu plan -detailed-exitcode             # 0 = in sync, 1 = error, 2 = drift
tofu init -upgrade                       # update providers, in their own PR
tofu state list                          # what's being managed
```

## Ansible: [details](./ansible)

```bash
ansible all -m ping                                  # can Ansible connect?
ansible-playbook site.yml --syntax-check && ansible-lint
ansible-playbook site.yml --check --diff             # preview
ansible-playbook site.yml --limit coolify-1          # one server at a time
ansible-vault create inventory/group_vars/all/vault.yml  # encrypted secrets
ansible-vault edit inventory/group_vars/all/vault.yml
```

## Docker: [details](./docker)

```bash
docker ps                                 # what's running, and is it healthy?
docker logs --tail 100 -f <container>
docker stats --no-stream                  # memory and CPU
docker compose config                     # the final config, with variables filled in
docker system df                          # what's using the disk
docker image prune && docker builder prune
```

Careful: `docker compose down -v` and `docker volume prune` can delete data.

## Coolify: [details](./coolify)

```bash
# Trigger a deployment
curl --fail-with-body -X POST -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "$COOLIFY_URL/api/v1/deploy?uuid=$COOLIFY_APP_UUID"

# Save this off the server
sudo grep '^APP_KEY=' /data/coolify/source/.env
```

## Server checks: [details](./operations)

```bash
df -h && free -h                          # disk and memory
cat /var/run/reboot-required              # is a reboot pending?
journalctl -p err -b                      # errors since boot
journalctl -u ssh --since "1 hour ago"
sudo sshd -t                              # check the SSH config before reloading
nmap -Pn -p 1-65535 203.0.113.10          # from OUTSIDE: what's actually open?
```

## Firewall ports: [details](./coolify#close-the-setup-ports)

| Port | Open to | Notes |
| --- | --- | --- |
| 22 | Admin networks only | Or only over a private network |
| 80, 443 | Everyone | Proxy and certificates |
| 8000, 6001, 6002 | Nobody, once the domain works | Coolify setup ports |
| Databases | Nobody | Don't publish them |
