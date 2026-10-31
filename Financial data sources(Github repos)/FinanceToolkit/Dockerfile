# This file is meant for deploying the MCP server using Docker Compose. This, together with
# the Docker Compose file, makes it possible to create a localhost deployment of the MCP server,
# which can be used for testing and development purposes or for running on a server.
#
# The server is currently already live at financetoolkit.jeroenbouma.com/mcp

FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --extra mcp --no-dev

COPY financetoolkit/ financetoolkit/

ENV MCP_TRANSPORT=streamable-http
ENV MCP_HOST=0.0.0.0
ENV MCP_PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uv", "run", "financetoolkit-mcp"]
