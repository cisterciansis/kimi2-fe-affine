# Kimi2 with Chutes for Affine

## Features

- **Real-Time Streaming:** Get AI-generated responses on the fly.
- **Intuitive UI:** Clean, responsive interface built with custom UI components.
- **Markdown Support:** Render formatted output for a better reading experience.
- **Request Cancellation:** Abort ongoing requests gracefully using the AbortController.
- **Modern Tooling:** Developed using React, Vite, and the latest web standards.

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- An API key from [Chutes](https://chutes.ai/)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/cisterciansis/vite-react-kimi2
   cd vite-react-kimi2
   ```

2. **Install dependencies:**

   Using npm:

   ```bash
   npm install
   ```

   Or using Yarn:

   ```bash
   yarn install
   ```

3. **Configure Environment Variables:**

   Create a `.env` file in the root directory and add your OpenRouter API key:

   ```env
   VITE_CHUTES_API_TOKEN=your_api_key_here
   ```

### Running the Application

Start the development server:

```bash
npm run dev
```

Or with Yarn:

```bash
yarn dev
```

Then, open your browser and navigate to the URL provided (usually `http://localhost:5173`) to interact with the app.
