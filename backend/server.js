import express from "express"


const app = express();
app.use(express.static("public"));
app.use(express.json());


const port = 3000;


const messages = [{ from: "Zohreh", text: "Welcome to the chat!"}];


app.get("/messages", (req,res) => {
    res.json(messages)

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
    console.log(`Quote server listening on port ${port}`);
})


