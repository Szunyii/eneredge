# EnerEdge

Solar park monitoring without an on-site device: the park's existing router builds a WireGuard
tunnel to the platform, and the platform reads the inverters over Modbus TCP, read-only. This
repository is a Bun workspace with the API, the web app and the database package; the spec and the
implementation plans are in [`docs/`](docs/).
