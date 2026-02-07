---
name: email-tools
version: 1.0.0
description: Read and send emails from the terminal using himalaya or curl/SMTP
author: Code Buddy
tags: email, smtp, imap, himalaya, mail
---

# Email Tools

## Overview

Read and send emails from the terminal.

## himalaya (recommended CLI email client)

### Install
```bash
# macOS
brew install himalaya

# Linux (cargo)
cargo install himalaya

# Or download binary from GitHub releases
```

### Configure (~/.config/himalaya/config.toml)
```toml
[accounts.default]
email = "you@example.com"
display-name = "Your Name"

backend.type = "imap"
backend.host = "imap.gmail.com"
backend.port = 993
backend.login = "you@example.com"
backend.auth.type = "password"
backend.auth.raw = "app-password-here"

message.send.backend.type = "smtp"
message.send.backend.host = "smtp.gmail.com"
message.send.backend.port = 465
message.send.backend.login = "you@example.com"
message.send.backend.auth.type = "password"
message.send.backend.auth.raw = "app-password-here"
```

### Usage
```bash
# List messages
himalaya list

# Read message
himalaya read <id>

# Send
himalaya send <<EOF
From: you@example.com
To: friend@example.com
Subject: Hello from terminal

Message body here.
EOF

# Reply
himalaya reply <id>

# Search
himalaya search "subject:important"
```

## curl + SMTP (no extra tools)

### Send email
```bash
curl --ssl-reqd \
  --url "smtps://smtp.gmail.com:465" \
  --user "you@gmail.com:app-password" \
  --mail-from "you@gmail.com" \
  --mail-rcpt "to@example.com" \
  -T - <<EOF
From: you@gmail.com
To: to@example.com
Subject: Hello

This is the email body.
EOF
```

## Gmail App Passwords

For Gmail with 2FA:
1. Go to https://myaccount.google.com/apppasswords
2. Generate an app password
3. Use it instead of your real password

## Tips

- Use app passwords, never your real password
- himalaya supports IMAP/SMTP, Notmuch, and Maildir backends
- For Gmail, enable "Less secure app access" or use app passwords
- `himalaya list --folder INBOX --max 10` for recent messages
- Pipe email content to other tools: `himalaya read 123 | summarize`
