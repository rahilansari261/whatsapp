require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const cors = require("cors");

const server = http.createServer(app);
const io = socketIo(server);
const SECRET_TOKEN = process.env.SECRET_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

app.use(express.json());
app.use(cors());

app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("Client connected");

  // Disconnect event
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.get("/", (req, res) => {
  res.status(200).json("Hello This is webhook setup for whatsapp.");
});
// to verify the callback url from dashboard side - cloud api side
app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let challenge = req.query["hub.challenge"];
  let token = req.query["hub.verify_token"];

  if (mode && token) {
    if (mode === "subscribe" && token === SECRET_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.status(403);
    }
  }
});

app.post("/webhook", (req, res) => {
  let body_param = req.body;
  console.log(JSON.stringify(body_param, null, 2));

  if (body_param.object) {
    if (
      body_param.entry &&
      body_param.entry[0].changes &&
      body_param.entry[0].changes[0].value.messages &&
      body_param.entry[0].changes[0].value.messages[0]
    ) {
      let phone_no_id =
        body_param.entry[0].changes[0].value.metadata.phone_number_id;
      let from = body_param.entry[0].changes[0].value.messages[0].from;
      let msg_body = body_param.entry[0].changes[0].value.messages[0].text.body;

      // Emit message via Socket.io
      io.emit("message", { from, msg_body });

      axios({
        method: "POST",
        url:
          "https://graph.facebook.com/v16.0/" +
          phone_no_id +
          "/message?access_token=" +
          PAGE_ACCESS_TOKEN,
        data: {
          messaging_product: "whatsapp",
          to: from,
          text: {
            body: msg_body,
          },
        },
        headers: {
          "Content-Type": "application/json",
        },
      });
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  }
});
