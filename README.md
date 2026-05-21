# Management Dashboard for GitHub Pages

This folder is ready for GitHub Pages and uses a native static website structure.

## Files

- `index.html` contains the password gate and the encrypted dashboard page.
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
- The current `index.html` includes a browser-side password gate. Use `LMdashboard2026!` to unlock it. For compatibility, `LMdaschboard2026!` also works.
- GitHub Pages does not provide true server-side username/password protection for public pages. The password gate protects the main dashboard HTML from casual access, but files such as `data.json`, `style.css`, and `script.js` are still static assets on GitHub Pages if someone knows their direct URLs.
- Use Netlify Basic Auth or a hosted app with server-side login if strict access control is required later.
