# Day-to-Day Operations

Automation sets the server up, but it still needs looking after. These are the
routine jobs, and what's worth automating in each.

## Routine schedule

| How often | Task |
| --- | --- |
| Automatic, daily | Security updates, backups |
| Weekly | Read drift results and backup alerts, check disk space |
| Monthly | Update Coolify and base images, and review who has access |
| Quarterly | Test a real restore, and rotate CI credentials |

## Patching and reboots

The [`base` role](./ansible#automatic-security-patches) installs security updates
and reboots at a set time. To make that safe:

- **Apps must survive a reboot.** Use `restart: unless-stopped`, and try it once.
- **Check what's pending:** `cat /var/run/reboot-required` and
  `grep -i upgrade /var/log/unattended-upgrades/unattended-upgrades.log`.
- **Upgrade Docker and the OS release deliberately.** Upgrading Docker can restart
  your containers, and a new Ubuntu release is best done by building a new server
  and migrating to it.

## Monitoring and alerts

If you find out about an outage from your users, the monitoring has failed. Start
with these, and alert only on what someone has to act on:

- **Uptime, checked from outside the server.** A monitor on the same machine goes
  down with it, so use an external service for each public URL.
- **Disk usage**, with an alert at around 80%. Full disks cause outages that are
  easy to prevent.
- **TLS certificate expiry**, which many uptime services can check.
- **Backup success.** A heartbeat check that alerts when a backup *doesn't* report
  in also catches a backup job that stopped running altogether.
- **Coolify notifications** for failed deployments and backups. Configure a channel
  and send a test.

## Logs and disk

```bash
journalctl -u ssh --since "1 hour ago"     # a service's logs
journalctl -p err -b                       # errors since the last boot
docker logs --tail 100 -f <container>      # a container's logs
df -h && docker system df                  # what's using the disk
du -xh --max-depth=1 /var | sort -h        # find the biggest directories
```

Systemd journals and Docker logs both need a size cap. See
[log rotation](./docker#a-production-compose-file) for containers, and the
[Linux guide](../linux/system-and-packages) for the system tools.

## Access

- **Give each person their own key**, added through `base_admin_ssh_keys`. Removing
  someone is then a one-line pull request.
- **Prefer a private network for SSH**, like Tailscale or a VPN, and keep the public
  rule limited to known addresses.
- **Keep emergency access working.** Know how to reach your provider's web console,
  and test it before you need it.
- **Rotate credentials** on a schedule and whenever someone leaves.

## Backups

Backups are the one thing automation can't make up for. Follow **3-2-1**: three
copies, on two kinds of storage, with one off-site. In practice, there are four
separate things to back up:

| What | How | Why it isn't covered otherwise |
| --- | --- | --- |
| App databases | Coolify's scheduled backups to S3-compatible storage | Consistent dumps, stored off the server |
| Volumes and uploads | Your own job, such as restic to object storage | [Not included in Coolify's instance backup](https://next.coolify.io/docs/core/backup-and-recovery/instance-backup) |
| Coolify's own database | Coolify's instance backup, sent to S3 | Holds your projects, settings and encrypted secrets |
| Coolify's `APP_KEY` | Your password manager | **Not included in the backup** |

::: danger Save `APP_KEY` off the server today
Coolify encrypts stored credentials with this key, and its database backup doesn't
include it. Without it, a restored instance can't read its encrypted credentials
and private keys. Print it once and put it in your password manager:

```bash
sudo grep '^APP_KEY=' /data/coolify/source/.env
```

[Coolify's restore guide](https://coolify.io/docs/core/backup-and-recovery/instance-restore)
covers the steps. To move to another machine, you also need `/data/coolify/ssh/keys/`
and `~/.ssh/authorized_keys`.
:::

Provider snapshots (`backups = true` in Terraform) are a useful fast recovery, but
they aren't your only copy. They live with the same provider, in the same account,
and a snapshot of a running database may need crash recovery.

### A backup you haven't restored is only a hope

Test on a schedule, on a throwaway server:

1. Follow the [rebuild runbook](./your-own-server#rebuilding-from-scratch).
2. Restore the latest database backup, and check that real rows are there.
3. Write down how long it took, and fix whatever you had to look up.

Also make sure that the server's credentials can't delete old backups, for example
with object lock or a separate lifecycle policy. Otherwise an attacker or a bad
script on the server can destroy its own backups.

## Updating Coolify

1. Read the release notes.
2. Run a backup, and take a provider snapshot.
3. Update from the dashboard, or re-run the installer with the new version.
4. Check the dashboard, a deployment and an app.
5. Change `coolify_version` in Git, to match.

## When something breaks

Work from the outside in, and stop as soon as you've found the failing layer:

1. **DNS:** does `dig +short example.com` return the server's address?
2. **Network:** does `curl -vI https://example.com` connect, and what does it return?
3. **Server:** can you SSH in? Is the disk full (`df -h`) or memory exhausted (`free -h`)?
4. **Proxy and app:** are the containers healthy (`docker ps`), and what do the logs say?
5. **Recent changes:** what was deployed or merged last? Rolling back is often the
   fastest fix, and you can investigate afterwards.

Afterwards, put any manual fix into Git, and write down what would have caught it
sooner.
