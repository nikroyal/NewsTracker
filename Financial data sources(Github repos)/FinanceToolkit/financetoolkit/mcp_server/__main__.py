"""
Allows running the MCP server as a module:

    python -m financetoolkit.mcp_server
"""

from financetoolkit.mcp_server.mcp_controller import main, mcp  # noqa: F401

if __name__ == "__main__":
    main()
