const express=require("express");
const cors=require("cors");
const path=require("path");
const ytdlp=require("youtube-dl-exec");

const app=express();
const PORT=process.env.PORT||10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

const formats={
  ultra:"best[height<=2160]/best",
  "1080":"best[height<=1080]/best",
  "780":"best[height<=780]/best",
  hd:"best[height<=720]/best"
};

function valid(url){
  try{
    return /(^|\.)tiktok\.com$/i.test(new URL(url).hostname);
  }catch{
    return false;
  }
}

app.get("/api/health",(req,res)=>{
  res.json({ok:true});
});

app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"public","index.html"));
});

app.post("/api/download",async(req,res)=>{
  const url=String(req.body?.url||"").trim();
  const quality=String(req.body?.quality||"1080");

  if(!valid(url))
    return res.status(400).json({
      success:false,
      message:"Valid TikTok URL required."
    });

  try{
    const output=await ytdlp(url,{
      getUrl:true,
      format:formats[quality]||formats["1080"],
      noPlaylist:true,
      noWarnings:true
    });

    const lines=String(output).trim().split(/\r?\n/).filter(Boolean);
    const download_url=lines.pop();

    if(!download_url)
      throw new Error("No media URL");

    res.json({
      success:true,
      type:"video",
      quality,
      download_url
    });

  }catch(e){
    console.error(e);
    res.status(500).json({
      success:false,
      message:"Could not download this TikTok video."
    });
  }
});

app.listen(PORT,"0.0.0.0",()=>{
  console.log("Server running on port "+PORT);
});
