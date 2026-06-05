# Fast-ILA static frontend — served by nginx on Koyeb.
# No build step: the app is React-via-Babel-standalone loaded from index.html.
FROM nginx:1.27-alpine

# Custom server config (clean URLs, .jsx MIME, SPA fallback, cache headers).
RUN rm -f /etc/nginx/conf.d/default.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/fastila.conf

# Copy the static site (see .dockerignore for what's excluded).
COPY . /usr/share/nginx/html
# Belt-and-braces: never web-serve backend/dev files even if context changes.
RUN rm -rf /usr/share/nginx/html/supabase \
           /usr/share/nginx/html/docs \
           /usr/share/nginx/html/.git \
           /usr/share/nginx/html/.claude \
           /usr/share/nginx/html/node_modules 2>/dev/null || true

EXPOSE 8000
CMD ["nginx", "-g", "daemon off;"]
