# A digest can't be moved the way a tag can. Keep the tag for humans and update tools.
FROM golang:1.25-alpine@sha256:1ae0735f00daffa3aaf1363a5184c0d2dc55c78e3db4ec70241cdac97bf84b59 AS build
WORKDIR /src
# Copy the module file first, so a code change doesn't invalidate this layer's cache.
COPY go.mod ./
COPY main.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /app .

# The final image holds only the binary: no compiler, shell or package manager.
FROM gcr.io/distroless/static-debian12:nonroot@sha256:afa5c872c891853ca7fcf1f12c3edb23f7eeef36189728842dd51042ff57f7ab
COPY --from=build /app /app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD ["/app", "-healthcheck"]
ENTRYPOINT ["/app"]
