# Contributing Guide 🐙

Thank you for your interest in contributing to **Octopus Control**! This project is open source and we greatly appreciate any kind of help, from bug fixes to new features.

## How can you contribute?

### 1. Reporting Bugs
If you find a bug, please open an **Issue** describing:
- The expected behavior.
- The actual behavior.
- Steps to reproduce the bug.
- Your environment (browser, operating system).

### 2. Suggesting Improvements
Have an idea to improve the site? Open an **Issue** with the `enhancement` label and tell us more.

### 3. Submitting Changes (Pull Requests)
If you want to dive into the code, follow these steps:

1.  **Fork** the repository.
2.  **Create a branch** for your feature or fix (`git checkout -b feature/new-feature`).
3.  **Make your changes** following the project standards.
4.  **Ensure everything works** by running the project locally.
5.  **Commit** with a clear message (`git commit -m 'Add feature X'`).
6.  **Push** to your branch (`git push origin feature/new-feature`).
7.  **Open a Pull Request** explaining your changes.

## Development Environment Setup

To work on this project, you will need:

- **Node.js** (recommended version v18 or higher)
- **pnpm** (package manager)

### Initial Steps:

1.  Clone the repository:
    ```bash
    git clone https://github.com/martinezharo/octopus-control.git
    cd octopus-control
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Configure environment variables:
    Create a `.env` file based on `.env.example` (if it exists) or add your Supabase credentials:
    ```env
    PUBLIC_SUPABASE_URL=your_supabase_url
    PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  Start the development server:
    ```bash
    pnpm dev
    ```

## Coding Style

- We use **Astro** for structure and components.
- Styling is mainly handled with **Vanilla CSS** in `src/styles/global.css`.
- We try to keep the code clean and well-commented.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and constructive environment. Any offensive or harassing behavior will not be tolerated.

---

We look forward to your contributions! Together we will make **Octopus Control** the best remote control store. 🚀
