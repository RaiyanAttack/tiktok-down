const express=require("express");
const cors=require("cors");
const path=require("path");
const ytdlp=require("youtube-dl-exec");

const app=express();
const PORT=process.env.PORT||10000;

app.use(cors());
app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname,"public")));

const formats={
  ultra:"best[height<=2160]/best",
  "1080":"best[height<=1080]/best",
  "780":"best[height<=780]/best",
  hd:"best[height<=720]/best"
};

/* TikTok URL */
function valid(url){
  try{
    const u=new URL(url);
    const h=u.hostname.toLowerCase();

    return h==="tiktok.com" || h.endsWith(".tiktok.com");
  }catch{
    return false;
  }
}

/* HOME */
app.get("/",(req,res)=>{
  res.sendFile(
    path.join(__dirname,"public","index.html")
  );
});

/* HEALTH */
app.get("/api/health",(req,res)=>{
  res.json({
    ok:true,
    service:"tiktok-media-downloader"
  });
});

/* INFO */
app.get("/api/info",async(req,res)=>{

  const url=String(req.query.url||"").trim();

  if(!valid(url)){
    return res.status(400).json({
      success:false,
      message:"Valid TikTok URL required."
    });
  }

  try{

    const info=await ytdlp(url,{
      dumpSingleJson:true,
      skipDownload:true,
      noPlaylist:true,
      noWarnings:true,
      noCheckCertificates:true
    });

    res.json({
      success:true,
      title:info.title||"TikTok Video",
      thumbnail:info.thumbnail||"",
      uploader:info.uploader||"",
      duration:info.duration||0
    });

  }catch(e){

    const error=String(
      e.stderr||e.message||e
    );

    console.error("INFO ERROR:",error);

    res.status(500).json({
      success:false,
      message:"TikTok information পাওয়া যায়নি।",
      error:error
    });
  }
});

/* DOWNLOAD */
app.post("/api/download",async(req,res)=>{

  const url=String(
    req.body?.url||""
  ).trim();

  const quality=String(
    req.body?.quality||"1080"
  );

  if(!valid(url)){
    return res.status(400).json({
      success:false,
      message:"Valid TikTok URL required."
    });
  }

  const format=
    formats[quality]||
    formats["1080"];

  try{

    const output=await ytdlp(url,{
      getUrl:true,
      format:format,
      noPlaylist:true,
      noWarnings:true,
      noCheckCertificates:true
    });

    const lines=String(output)
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);

    const download_url=
      lines[lines.length-1];

    if(
      !download_url ||
      !/^https?:\/\//i.test(download_url)
    ){
      throw new Error(
        "No valid media URL returned."
      );
    }

    res.json({
      success:true,
      type:"video",
      quality:quality,
      download_url:download_url
    });

  }catch(e){

    const error=String(
      e.stderr||e.message||e
    );

    console.error(
      "DOWNLOAD ERROR:",
      error
    );

    res.status(500).json({
      success:false,
      message:"TikTok video পাওয়া যায়নি।",
      error:error
    });
  }
});

/* 404 */
app.use((req,res)=>{
  res.status(404).json({
    success:false,
    message:"Route not found."
  });
});

/* START */
app.listen(PORT,"0.0.0.0",()=>{
  console.log(
    "Server running on port "+PORT
  );
});
