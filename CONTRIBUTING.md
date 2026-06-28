# Contributing to Deadline Guardian (AURA)

First off, thank you for taking the time to contribute! 🎉

This project was built for the **Vibe2Ship Hackathon** to revolutionize personal productivity using Google Gemini and a highly focused design-first approach. We welcome contributions from developers, designers, and writers of all skill levels.

---

## 🗺️ How Can I Contribute?

### 1. Reporting Bugs
*   Check the [Issues](https://github.com/saishivasanjeeth/deadline-guardian/issues) page to make sure the bug hasn't already been reported.
*   If you find a new bug, open a new issue using our **Bug Report Template**.
*   Include clear steps to reproduce, what you expected to see, and what actually happened.

### 2. Suggesting Enhancements
*   Submit an issue using our **Feature Request Template**.
*   Describe the exact user-facing problem this feature solves and the proposed implementation.

### 3. Submitting Pull Requests
*   **Fork** the repository and create your branch from `main`.
*   If you've added code that should be tested, add unit or integration tests if applicable.
*   Ensure that current tests and formatting pass:
    ```bash
    npm run lint
    ```
*   Create a clean, descriptive pull request using our **PR Template**.

---

## 💻 Local Development Workflow

1.  **Fork and Clone**
    ```bash
    git clone https://github.com/your-username/deadline-guardian.git
    cd deadline-guardian
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Ensure you have your environment file set up properly:
    ```bash
    cp .env.example .env
    ```

4.  **Local Testing**
    *   Run lint checks: `npm run lint`
    *   Run production build locally: `npm run build`

---

## 📜 Code Style Guidelines

*   **TypeScript**: Keep types safe, avoid `any` where possible.
*   **Tailwind**: Utilize standard spacing patterns and keep cards styled consistently using our retro border classes (`border-2 border-[#292524] shadow-[4px_4px_0px_#292524]`).
*   **Accessibility**: Always specify `title`, `aria-label`, and `id` tags on meaningful form inputs, select controls, and buttons.

---

## 🤝 Code of Conduct

By participating, you agree to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the project maintainers.
