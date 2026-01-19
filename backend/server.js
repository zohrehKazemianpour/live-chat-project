import express from "express"


const app = express();
app.use(express.static("public"));
app.use(express.json());


const port = 3000;


const messages = [{ from: "Zohreh", text: "Welcome to the chat!"}];


app.get("/messages", (req,res) => {

  const since = req.query.since;

  if (since !== undefined) {
    const sinceIndex = parseInt(since);
    const messageSince = messages.slice(sinceIndex + 1);
    res.json(messageSince)

  } else {
    res.json(messages);
  }

})

app.post("/messages", (req, res) => {

    
    const { from, text } = req.body;

    if (!from || !text || from.trim() === "" || text.trim() === "") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide both a name and a message.",
        });
    }  


    messages.push({from,text})
   
   res.status(201).json({from, text});


})




app.listen(port, () => {
    console.log(`server listening on port ${port}`);
})


