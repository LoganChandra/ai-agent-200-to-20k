# DevUtils CLI

A zero-dependency developer utility CLI for common day-to-day tasks: formatting JSON, converting simple data, hashing, encoding, inspecting timestamps/JWTs/URLs/files, color conversion, text utilities, and lightweight network helpers.

## Design goals

- **Zero runtime dependencies** for predictable installs
- **Pipe-friendly** stdin/stdout behavior
- **Local-first** utilities; no network calls except explicit `inspect ip`/`net` commands
- **Safe command execution** for network helpers with validated arguments
- **Tested smoke path** for core commands

## Install / Run

```bash
node bin/devutils.js help
node bin/devutils.js gen uuid
echo '{"hello":"world"}' | node bin/devutils.js fmt json
```

If packaged globally:

```bash
devutils gen uuid
curl -s https://api.example.com | devutils fmt json
```

## Examples

```bash
devutils hash sha256 "hello world"
devutils encode base64 "hello"
devutils decode base64 "aGVsbG8="
devutils inspect timestamp 1714608000
devutils color hex-to-rgb "#22c55e"
echo "Hello World" | devutils text slug
```

## Quality notes

This CLI is intended as a practical utility bundle, not a replacement for specialized parsers. CSV/YAML conversion supports common/simple structures and is documented as such.

## Verification

```bash
npm test
npm run check
```
