# Auto-SKIDL

Auto-SKIDL is a professional-grade electronic design workspace that leverages AI to generate, compile, and visualize SKiDL-based netlists. By combining the power of Python-based circuit descriptions with a modern web interface, it provides an end-to-end workflow for designing PCBs, from schematic logic to production-ready manufacturing files.

## Core Capabilities

- **AI-Powered Design**: Interactive chat agent capable of generating complex circuit logic using the SKiDL library.
- **Real-Time Compilation**: Instant feedback on circuit logic with automated ERC (Electrical Rule Check) and netlist generation.
- **Advanced Visualization**: Integrated layout for viewing generated Python code, netlists, and interactive connection diagrams.
- **Professional Export**: Single-click generation of Gerbers, STEP 3D models, SPICE netlists, BoMs, and more via KiCad integration.
- **Flexible Workspace**: Fully resizable panels with persistent state and fullscreen modes for focused design work.

## Technical Architecture

Auto-SKIDL is built using a modern stack designed for performance and reliability:

- **Frontend**: Next.js 16 with Tailwind CSS and Lucide icons.
- **Backend**: Python 3.11 environment with SKiDL and KiCad-CLI for circuit processing.
- **Database**: PostgreSQL with Prisma ORM for user and project management.
- **Orchestration**: Docker Compose for seamless deployment and environment consistency.

## Environment Setup

Before launching, you must configure your environment variables.

1. Create a copy of the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file and provide the required keys:
   - `DATABASE_URL`: Connection string for the PostgreSQL database.
   - `JWT_SECRET`: A secure string for authentication tokens.
   - `OPENAI_API_KEY` or `DEEPSEEK_API_KEY`: Required for the AI chat functionality.
   - `RESEND_API_KEY`: Required for system emails and user registration.

Refer to the [.env.example](.env.example) file for detailed descriptions and suggested values.

## Deployment with Docker Compose

The simplest and most reliable way to run Auto-SKIDL is using Docker Compose. This ensures all dependencies, including the Python environment and KiCad tools, are correctly configured.

### Prerequisites

- Docker installed on your system.
- Docker Compose v2 or higher.

### Launch Instructions

1. **Build and start the containers**:

   ```bash
   docker compose up -d --build
   ```

2. **Run database migrations**:
   Once the database container is healthy, apply the Prisma schema:

   ```bash
   docker compose exec app npx prisma migrate dev
   ```

3. **Access the application**:
   Open your browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

### Managing the Stack

- **Stop the application**: `docker compose down`
- **View logs**: `docker compose logs -f app`
- **Rebuild after changes**: `docker compose up -d --build`

## Development Workflow

If you prefer to run the application locally without Docker, ensure you have KiCad 8.0+ and Python 3.11+ installed.

1. **Install Node.js dependencies**:

   ```bash
   npm install
   ```

2. **Set up Python environment**:

   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
   pip install skidl
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

The application will be available at [http://localhost:3001](http://localhost:3001) (or your configured port).
