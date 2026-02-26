const http = require("http");
const { execFile } = require("child_process");
const crypto = require("crypto");

const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET || "sgtd-deploy-secret";
const DEPLOY_SCRIPT = "/home/eonsr/SGTD_Admin-Web-CMS/deploy.sh";

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/webhook") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      // Verify GitHub signature
      const sig = req.headers["x-hub-signature-256"];
      if (sig) {
        const hmac = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
        if (sig !== `sha256=${hmac}`) {
          res.writeHead(403);
          res.end("Invalid signature");
          return;
        }
      }

      const payload = JSON.parse(body);
      if (payload.ref === "refs/heads/main") {
        console.log(`[webhook] Push to main detected, deploying...`);
        execFile(DEPLOY_SCRIPT, (err, stdout, stderr) => {
          if (err) console.error("[webhook] Deploy error:", stderr);
          else console.log("[webhook] Deploy output:", stdout);
        });
        res.writeHead(200);
        res.end("Deploying...");
      } else {
        res.writeHead(200);
        res.end("Ignored (not main branch)");
      }
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[webhook] Listening on port ${PORT}`);
});
