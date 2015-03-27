# vocab
A small JavaScript manager for vocabulary. I needed this when I was learning Dutch on duolingo.com and the course was still in beta with no vocabulary manager. Could be useful for people learning languages and want to keep track of their learned vocabulary.

Local DB persistence is achieved via the Webkit filesystem API and tested for Chromium/Chrome. In non-supporting browsers, it's a readonly access to a user-selected database file (tested for Firefox and Opera for Linux).
