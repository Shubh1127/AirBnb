const express=require("express")
const mongoose=require("mongoose");
const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const path=require("path")
const method=require("method-override");
const ejsMate=require("ejs-mate")
const wrapAsync=require("./utils/wrapAsync.js")
const ExpressError=require("./utils/ExpressError.js")
const listingSchema=require("./Schema.js")
const reviewSchema=require("./Schema.js")

let app=express();
let port=8080;
app.use(method("_method"));

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"))
app.use(express.urlencoded({extended:true}))
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"public")))

const url="mongodb://127.0.0.1:27017/Airbnb";
async function main() {
    await mongoose.connect(url)
}
main().then(()=>{
    console.log("connected to db")
}) 
.catch((err)=>{
    console.log(err)
})
app.listen(port,(req,res)=>{
    console.log("app is listening to port ",port);
})

//root path
app.get("/",(req,res)=>{
    res.send("hello i am root")
})

//show all listings
app.get("/listings",wrapAsync( async (req,res)=>{
    let allListings= await Listing.find({});
    res.render("./listings/index.ejs", { allListings })
})
);
//add new listing
app.get("/listings/new", (req,res)=>{
    res.render("./listings/new.ejs")
})


const validateListing=(req,res,next)=>{
let{error}=listingSchema.validate(req.body);
if(error){
    throw new ExpressError(400,error)
}
else{
    next();
}

}
const validateReview=(req,res,next)=>{
let{error}=reviewSchema.validate(req.body);
if(error){
    let errMsg=error.details.map((el)=>el.message).join(",")
    throw new ExpressError(400,errMsg)
}
else{
    next();
}

}
//create listing
app.post("/listings",validateListing, wrapAsync(async (req,res ,next)=>{
    
    const newListing=new Listing(req.body.listing);
        await  newListing.save()
        res.redirect("/listings");
    
})
)

//show listing
app.get("/listings/:id", wrapAsync(async (req,res)=>{
    let {id}=req.params;
    const listing= await Listing.findById(id).populate("reviews")
    // console.log(listing.reviews);
    res.render("./listings/show.ejs",{listing})
})
);

app.get("/listings/:id/edit", wrapAsync(async (req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id);
    res.render("./listings/edit.ejs",{listing})
})
)
//edit listing
app.put("/listings/:id",validateListing, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let updatedData = { ...req.body.listing };
   

    // Ensure fields are handled as strings or other expected types
    for (let key in updatedData) {
        // If you have fields that are expected to be arrays, handle them differently.
        // Here, we are treating fields as strings or other types.
        if (Array.isArray(updatedData[key])) {
            updatedData[key] = updatedData[key].join(', '); // Convert arrays to strings if needed
        }
    }

    try {
        await Listing.findByIdAndUpdate(id, updatedData, { new: true }); // { new: true } returns the updated document
        res.redirect(`/listings/${id}`);
    } catch (error) {
        console.error(error);
        res.status(400).send("Error updating listing");
    }
})
);


//delete listing

app.delete("/listings/:id", wrapAsync(async (req,res)=>{
    let {id}=req.params;
    let listing=await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
})


);
//REVIEWS
//post route
app.post("/listings/:id/reviews", validateReview ,wrapAsync(async (req,res)=>{
    let listing= await Listing.findById(req.params.id);
    
    let newReview =new Review(req.body.review)
   

    listing.reviews.push(newReview)


    await newReview.save()
   await  listing.save()

   console.log("review was saved")
   res.redirect(`/listings/${listing._id}`)
}));


app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page Not Found!"));
});

app.use((err,req,res,next)=>{
    let {statusCode=500,message="Something went wrong!"}=err;
    res.status(statusCode).render("error.ejs",{err});
    // res.status(statusCode).send(message)
})

