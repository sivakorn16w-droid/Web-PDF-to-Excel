# PDF to Excel — GitHub Pages Frontend

This is the static frontend of the PDF to Excel Converter V15.

## Publish on GitHub Pages

1. Create/open your GitHub repository.
2. Upload **all files and folders inside this package** while keeping the same structure.
3. Go to **Settings → Pages**.
4. Select **Deploy from a branch**.
5. Branch: `main` and folder: `/ (root)`.
6. Save and wait for GitHub Pages to deploy.

## Folder structure

```text
PDF-to-Excel/
├── index.html
├── static/
│   ├── style.css
│   ├── app.js
│   └── pic/
│       ├── app_logo.png
│       ├── icon_pdf.png
│       └── icon_excel.png
├── .nojekyll
├── .gitignore
└── README.md
```

## Important

GitHub Pages can display this interface, but it cannot run the Flask/Python PDF parser. The Scan/Export functions need the backend server. When your friend's server is ready, the API URLs in `static/app.js` can be changed to the backend URL.
