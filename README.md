# 🐙 Octopus Control - Web E-commerce

![Astro](https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=white)
![Fewya](https://img.shields.io/badge/Catalog-Fewya_sync-5b7fff?style=for-the-badge)
![Cloudflare](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

**Octopus Control** is an e-commerce platform specializing in remote controls for televisions and streaming devices. This website is designed to provide a fast, intuitive, and efficient shopping experience, allowing users to find the exact remote they need for their device.

## ✨ Key Features

- 🔍 **Advanced Filtering**: Search and filter system by brand and category to locate products almost instantly.
- 📱 **Responsive Design**: Fully optimized for mobile devices, tablets, and desktops.
- ⚡ **High Performance**: Developed with Astro 5 for ultra-fast loading (Islands Architecture).
- 🔄 **Catalog Sync**: Titles, descriptions, images, prices and stock are mirrored from the Fewya shop at build time.
- 🔗 **Permanent URLs**: Sold-out and retired products keep their page and their search history instead of 404ing.
- 🎨 **Premium Aesthetics**: Modern, clean, and conversion-focused interface.
- 📦 **Shipping Management**: Clear information on shipping, returns, and warranty policies.

## 🛠️ Tech Stack

- **Frontend**: [Astro](https://astro.build/) (v5+)
- **Data Source**: [Fewya](https://fewya.com) public catalog feed, with a committed snapshot as fallback
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

## 🔄 Catalog

The catalog mirrors the `octopus-control` shop on Fewya. Fewya owns the content;
this repository owns the URLs — a product that stops being sold keeps its page.

No environment variables are needed: `FEWYA_BASE_URL` and `FEWYA_SHOP_SLUG`
default to production, and the build degrades gracefully if the feed is
unreachable.

```bash
pnpm sync:catalog   # refresh the committed fallback copy
pnpm test           # verify slug matching against the real catalog
```

See **[docs/catalog-sync.md](./docs/catalog-sync.md)** before changing anything
under `src/lib/catalog/` or `src/data/`.

## 📂 Project Structure

```text
/
├── public/          # Static assets
├── src/
│   ├── components/  # UI Components (.astro)
│   ├── data/        # Snapshot, URL registry and cached Fewya feed
│   ├── layouts/     # Base page layouts
│   ├── lib/         # Catalog sync, slug matching and helpers
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
