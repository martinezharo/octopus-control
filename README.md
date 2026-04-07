# 🐙 Octopus Control - Web E-commerce

![Astro](https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=white)
![JSON](https://img.shields.io/badge/Data-JSON-blue?style=for-the-badge&logo=json&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

**Octopus Control** is an e-commerce platform specializing in remote controls for televisions and streaming devices. This website is designed to provide a fast, intuitive, and efficient shopping experience, allowing users to find the exact remote they need for their device.

## ✨ Key Features

- 🔍 **Advanced Filtering**: Search and filter system by brand and category to locate products almost instantly.
- 📱 **Responsive Design**: Fully optimized for mobile devices, tablets, and desktops.
- ⚡ **High Performance**: Developed with Astro 5 for ultra-fast loading (Islands Architecture).
- 📂 **Static Data**: Products are managed via a static JSON file for maximum speed and simplicity.
- 🎨 **Premium Aesthetics**: Modern, clean, and conversion-focused interface.
- 📦 **Shipping Management**: Clear information on shipping, returns, and warranty policies.

## 🛠️ Tech Stack

- **Frontend**: [Astro](https://astro.build/) (v5+)
- **Data Source**: Static JSON (`src/data/productos.json`)
- **Package Management**: [pnpm](https://pnpm.io/)
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/)
- **Styling**: Vanilla CSS with modern variables.

## 🚀 Quick Start

To run the project locally, follow these steps:

### Prerequisites
- Node.js (v18+)
- pnpm installed: `npm install -g pnpm`

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/martinezharo/octopus-control.git
    cd octopus-control
    ```

2.  **Install dependencies**
    ```bash
    pnpm install
    ```

3.  **Run the development server**
    ```bash
    pnpm dev
    ```
    The website will be available at `http://localhost:4321`.

## 📂 Project Structure

```text
/
├── public/          # Static assets
├── src/
│   ├── components/  # UI Components (.astro)
│   ├── data/        # Static data files (JSON)
│   ├── layouts/     # Base page layouts
│   ├── lib/         # Utility functions and data fetching
│   ├── pages/       # Routes and application pages
│   └── styles/      # Global CSS styles
├── astro.config.mjs # Main Astro configuration
└── package.json     # Dependencies and scripts
```

## 🤝 Contributing

All contributions are welcome! If you want to improve the design, fix a bug, or add a feature:

1. Read our [Contributing Guide](./CONTRIBUTING.md).
2. Open an Issue or submit a Pull Request.

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

---

Developed with ❤️ by [Oli](https://olivermartinezharo.com).
