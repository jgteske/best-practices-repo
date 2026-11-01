---
name: drawio
description: Create or edit .drawio.png diagrams for this repo's docs (editable PNGs with the draw.io source embedded). Use for complex diagrams - many nodes, nested boundaries, or precise layout, such as architecture and network maps. Keep simple flows and sequences in inline Mermaid.
---

# draw.io diagrams

A `.drawio.png` is one file: the image the docs show, with the draw.io source embedded. There is no separate source file to commit.

## Mermaid or draw.io

- **Mermaid** (the default in these docs): simple flows and sequences that auto-layout renders clearly.
- **draw.io**: many nodes, nested boundaries, crossing connections, or anything that needs a hand-placed layout.

## Where it goes

Save as `docs/<section>/diagrams/<kebab-case-name>.drawio.png` and embed with a relative path and real alt text that states what the diagram shows:

```md
![Tailnet traffic reaches Paperclip through the Tailscale sidecar](./diagrams/tailnet-traffic.drawio.png)
```

## Create

1. Write the XML to `docs/<section>/diagrams/<name>.drawio`. Stay under `$HOME`: draw.io runs as a Flatpak with a private `/tmp`, so scratch paths under `/tmp` fail.

   ```xml
   <mxfile>
     <diagram name="Page-1" id="page-1">
       <mxGraphModel adaptiveColors="none" background="#ffffff" grid="1" gridSize="10" page="0">
         <root>
           <mxCell id="0"/>
           <mxCell id="1" parent="0"/>
           <mxCell id="client" value="Client" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
             <mxGeometry x="40" y="40" width="120" height="60" as="geometry"/>
           </mxCell>
           <mxCell id="server" value="Server" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">
             <mxGeometry x="280" y="40" width="120" height="60" as="geometry"/>
           </mxCell>
           <mxCell id="client-server" value="HTTPS" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;" edge="1" parent="1" source="client" target="server">
             <mxGeometry relative="1" as="geometry"/>
           </mxCell>
         </root>
       </mxGraphModel>
     </diagram>
   </mxfile>
   ```

   - Keep `background="#ffffff"`: a transparent PNG loses its dark text and lines in the site's dark theme.
   - Escape `&`, `<`, `>` and `"` inside attribute values. Connect every edge with `source` and `target`, so it stays attached when someone moves a box.
   - Show a boundary with a container cell, and set `parent` on its children to the container's id. Child coordinates are relative to the container.

2. Export. `-e` embeds the source; without it the PNG can no longer be edited.

   ```bash
   flatpak run com.jgraph.drawio.desktop -x -f png -e -s 2 -b 10 --timeout 60 \
     -o docs/<section>/diagrams/<name>.drawio.png docs/<section>/diagrams/<name>.drawio
   ```

   Success prints `<input> -> <output>`. GTK and `dbus` errors in the output are harmless noise. The export needs a graphical session (`DISPLAY` or `WAYLAND_DISPLAY`).

3. Read the PNG and look at it. Fix overlaps, clipped labels and edges crossing through boxes, then export again.
4. Delete the `.drawio` file and commit only the `.drawio.png`.

## Edit

Recover the source, change it, and follow Create from step 2:

```bash
flatpak run com.jgraph.drawio.desktop -x -f xml --timeout 60 \
  -o docs/<section>/diagrams/<name>.drawio docs/<section>/diagrams/<name>.drawio.png
```

## Verify

Run `npm run docs:build`, which fails if the image path doesn't resolve.
