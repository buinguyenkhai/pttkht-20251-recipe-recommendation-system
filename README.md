# Let Me Cook

## Quick Start

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Setup & Run

```powershell
# 1. Start containers
./docker.ps1

# 2. Initialize database & import recipes
./initialize.ps1

# 3. Add dummy users and reviews for testing
./dummy_data.ps1
```

### Access the App

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |

### Default Admin Account
- **Username:** `admin`
- **Password:** `Abcd@1234`