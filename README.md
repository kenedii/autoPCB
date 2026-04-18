# Auto-SKIDL

Auto-SKIDL is a professional-grade electronic design workspace that leverages AI to generate, compile, and visualize SKiDL-based netlists. By combining the power of Python-based circuit descriptions with a modern web interface, it provides an end-to-end workflow for designing PCBs, from schematic logic to production-ready manufacturing files.

## ✨ Features

- **AI-Powered Design**: Interactive chat agent capable of generating complex circuit logic using the SKiDL library.
- **Real-Time Compilation**: Instant feedback on circuit logic with automated ERC (Electrical Rule Check) and netlist generation.
- **Advanced Visualization**: Integrated layout for viewing generated Python code, netlists, and interactive connection diagrams.
- **Professional Export**: Single-click generation of Gerbers, STEP 3D models, SPICE netlists, BoMs, and more via KiCad integration.
- **Flexible Workspace**: Fully resizable panels with persistent state and fullscreen modes for focused design work.
- **User Accounts**: Registration and login with JWT authentication.
- **Email Notifications**: Optional compile-completion emails with workspace links and artifact downloads.
- **Account Settings**: User preferences for notification delivery.

## 🏗️ Technical Architecture

Auto-SKIDL is built using a modern stack designed for performance and reliability:

- **Frontend**: Next.js 16 with Tailwind CSS and Lucide icons.
- **Backend**: Python 3.11 with SKiDL and KiCad-CLI for circuit processing.
- **Database**: PostgreSQL with Prisma ORM for user and project management.
- **Email**: Resend API for transactional emails (registration, compile notifications).
- **Authentication**: JWT-based session management with httpOnly cookies.
- **Orchestration**: Docker Compose for seamless deployment and environment consistency.

## 🚀 Quick Start (Docker Compose - Recommended)

Docker Compose is the easiest and most reliable way to run Auto-SKIDL. All dependencies, Python environment, and KiCad tools are pre-configured.

### Prerequisites

- **Docker**: Download from [docker.com](https://www.docker.com)
- **Docker Compose**: Included with Docker Desktop (v2.0+)
- **Git**: For cloning the repository

### Step 1: Clone the Repository

```bash
git clone https://github.com/kenedii/autoPCB.git
cd autoPCB
```

### Step 2: Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and set the required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Use `postgresql://postgres:password@db:5432/autopcb_db` for Docker |
| `JWT_SECRET` | ✅ | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `RESEND_API_KEY` | ✅ | Sign up at [resend.com](https://resend.com) and get your API key |
| `OPENAI_API_KEY` or `DEEPSEEK_API_KEY` | ✅ | At least one AI provider required |
| `NEXT_PUBLIC_APP_URL` | ✅ | Set to `http://localhost:3000` for local, or your domain for production |
| `RESEND_TEST_EMAIL` | ❌ | (Dev only) Override recipient email for sandbox testing |
| `NODE_ENV` | ❌ | Default: `development` |

### Step 3: Build and Start

```bash
docker compose up -d --build
```

This will:
- Download and build the Node.js application container
- Start a PostgreSQL database
- Apply all database migrations automatically
- Set up Python environment with SKiDL support

### Step 4: Access the Application

Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

The application should be running in a few seconds. Check container health:

```bash
docker compose ps
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d --build` | Start/rebuild all containers |
| `docker compose down` | Stop all containers |
| `docker compose logs -f app` | View application logs in real-time |
| `docker compose logs -f db` | View database logs |
| `docker compose exec app npx prisma migrate dev` | Run pending migrations manually |
| `docker compose exec app npx prisma studio` | Open Prisma Studio for database inspection |

## 💻 Local Development (Without Docker)

If you prefer running locally, ensure you have these prerequisites installed:

- **Node.js** 18+ (with npm)
- **Python** 3.11+
- **KiCad** 8.0 or later ([download here](https://www.kicad.org/download/))
- **PostgreSQL** 14+ (running locally on port 5432)

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/kenedii/autoPCB.git
cd autoPCB
npm install
```

### Step 2: Set Up Python Environment

```bash
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

# Install SKiDL and dependencies
pip install skidl
```

### Step 3: Configure Environment

Copy and fill out your `.env` file:

```bash
cp .env.example .env
```

For local development:
- `DATABASE_URL="postgresql://postgres:password@localhost:5432/autopcb_db"`
- `NEXT_PUBLIC_APP_URL="http://localhost:3001"`

### Step 4: Initialize Database

```bash
npx prisma migrate dev
```

This will apply all migrations and set up your PostgreSQL database.

### Step 5: Start Development Server

```bash
npm run dev
```

The application will be available at **[http://localhost:3001](http://localhost:3001)**

## 🔧 Configuration Guide

### Environment Variables

Refer to [.env.example](.env.example) for all available configuration options with descriptions.

### Database

- **Docker**: PostgreSQL is managed automatically. Access via `postgresql://postgres:password@db:5432/autopcb_db`
- **Local**: Ensure PostgreSQL is running on port 5432 with user `postgres` and password `password`

### Email Configuration (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Set `RESEND_API_KEY` in your `.env`

**For Development/Sandbox Testing**:
- Set `RESEND_TEST_EMAIL` to redirect all emails to a verified address
- This is useful for testing without sending emails to real users

### AI Providers

Choose at least one:

- **OpenAI**: Sign up at [openai.com](https://platform.openai.com), get API key, set `OPENAI_API_KEY`
- **DeepSeek**: Sign up at [deepseek.com](https://deepseek.com), get API key, set `DEEPSEEK_API_KEY`

## 📧 Email Features

### Registration Emails
New users automatically receive a welcome email upon signup, containing:
- Account confirmation
- Link to the design workspace
- Quick start guide

### Compile Completion Notifications
When enabled in Account Settings:
- Users receive an email when circuit compilation completes
- Email includes links to view the circuit
- Lists all generated artifacts (KiCad files, Gerbers, STEP files, etc.)
- Can be toggled on/off anytime in Account Settings

**Note**: Notifications are **off by default**. Users can enable them in their Account Settings.

## 🧪 Testing

### Run Integration Tests

Test the complete registration and settings flow:

```bash
# Docker environment
docker compose exec app node test_settings.js

# Local environment
node test_settings.js
```

### Test Compile Notifications

Verify compile emails are sent correctly:

```bash
# Docker environment
docker compose exec app node test_compile_notification.js

# Local environment
node test_compile_notification.js
```

## 🐛 Troubleshooting

### Application won't start
- Check logs: `docker compose logs app`
- Ensure ports 3000 (app) and 5433 (database) are available
- Try rebuilding: `docker compose down -v && docker compose up -d --build`

### Database connection error
- Verify `DATABASE_URL` matches your setup
- For Docker: use `postgresql://postgres:password@db:5432/autopcb_db`
- For local: ensure PostgreSQL is running

### Python/SKiDL compilation errors
- Verify Python 3.11+ is installed: `python --version`
- Check SKiDL installation: `pip list | grep skidl`
- For Docker: errors indicate the Python environment wasn't set up correctly; rebuild with `docker compose up -d --build`

### Email not sending
- Verify `RESEND_API_KEY` is correct
- In development, set `RESEND_TEST_EMAIL` to a verified address
- Check Resend sandbox restrictions if in trial mode
- Review logs: `docker compose logs app | grep -i email`

## 📚 Project Structure

```
autoPCB/
├── src/
│   ├── app/                    # Next.js pages and API routes
│   │   ├── api/               # Backend API endpoints
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── compile/       # SKiDL compilation endpoint
│   │   │   ├── export/        # File export endpoints
│   │   │   ├── generate/      # AI-powered generation
│   │   │   └── netlist-graph/ # Netlist visualization
│   │   ├── design/            # Main design workspace
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   ├── lib/                   # Utility libraries
│   └── utils/                 # Helpers and templates
├── prisma/                   # Database schema and migrations
├── Dockerfile                # Production Docker image
├── docker-compose.yml        # Multi-container orchestration
├── .env.example             # Environment variable template
└── package.json             # Node.js dependencies
```

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and test them
4. Submit a pull request with a clear description

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🙋 Support

For issues, questions, or feature requests:
- Open an issue on [GitHub](https://github.com/kenedii/autoPCB/issues)
- Check existing documentation in this README
- Review error messages in application logs

---

**Built with ❤️ for PCB designers everywhere**
