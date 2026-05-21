# Management Dashboard for GitHub Pages

This folder is ready for GitHub Pages and uses a native static website structure.

## Files

- `index.html` contains the page structure.
- `style.css` contains the dashboard styling.
- `script.js` contains the dashboard logic.
- `data.json` contains the dashboard data.
- `assets/` contains third-party browser assets such as `html2canvas.min.js`.

## Upload

1. Open your GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Make sure `index.html` is in the root of the selected Pages branch.
4. In GitHub, go to `Settings` -> `Pages`.
5. Select the branch and `/root` as the publish source.

## Important

- GitHub Pages is static. The dashboard can be viewed online, but it cannot permanently process Excel/CSV uploads by itself.
- To update the dashboard later, regenerate the local dashboard and upload the updated `data.json`. If layout or logic changed too, upload `index.html`, `style.css`, `script.js`, and `assets/` as well.
- GitHub Pages does not provide username/password protection for public pages. Use Netlify or the hosted Python app if access control is required.
