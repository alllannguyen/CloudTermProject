const express = require("express");
const app = express();

const port = process.env.PORT || 8000;

app.listen(port, (error) =>
{
    if (error)
    {
        console.log("An error occured: " + error);
        return;
    }

    console.log("listening on port " + port);
});


