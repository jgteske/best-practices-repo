// A minimal web service for the Dockerfile and compose.yaml next to it.
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

const addr = ":8080"

func main() {
	// The distroless image has no shell or curl, so the binary checks itself.
	if len(os.Args) > 1 && os.Args[1] == "-healthcheck" {
		res, err := http.Get("http://localhost" + addr + "/healthz")
		if err != nil || res.StatusCode != http.StatusOK {
			os.Exit(1)
		}
		return
	}

	http.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		fmt.Fprintln(w, "ok")
	})
	log.Fatal(http.ListenAndServe(addr, nil))
}
