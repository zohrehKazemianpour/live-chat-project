import express from "express"


const app = express();
const port = 3000;


const messages = [{ from: "Zohreh", text: "Welcome to the chat!"}];


app.get("/", (req,res) => {
    res.json(messages)

})

app.listen(port, () => {
    console.log(`Quote server listening on port ${port}`);
})