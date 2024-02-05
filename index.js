//Necessary imports
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

//Modals 
const {CarModel} =require("./Models/CarModel")
const {BookingModel}=require("./Models/ActiveBookings")
const {PastBookingModel}=require("./Models/PastBookingModel");
const { CarMetaData } = require('./Models/CarMetaData');
const {SellerModel}=require('./Models/SellerModel')
const {CouponModel} =require('./Models/CouponModel')

//Functions
const {transporter}=require('./Mailer/Mail')

//ENV Varibales
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const DATABASE_URL=process.env.DATABASE_URL

mongoose.connect(DATABASE_URL)
  .then(() => {
    app.listen(8000, () => {
      console.log("Server connected");
      console.log("Running at 8000");
    });
  })
  .catch(() => {
    console.log("error");
  });

//Login
app.post('/',async(req,res)=>
{
    const {email,password}=req.body
    if(email==='admin@gmail.com' && password==='123456')
    {
        res.send({action:true})
    }
    else
    {
        res.send({action:false})
    }
})

//Dashboard
app.get('/Dashboard',async(req,res)=>
{
    const ListofCars=await CarModel.aggregate([
    {
      $match:
        {
            isverified:false
        }
    },
    {
       $lookup:{
           from:'sellerdetails',
           localField:'sid',
           foreignField:'sid',
           as:'sellerdetails'
       }
    },
    {
        $unwind: "$sellerdetails"
    },
    {
        $project: {
          _id: 1,
          'cardetails.car_no':'$$ROOT.car_no',
          'cardetails.name':'$$ROOT.name',
          'cardetails.img':'$$ROOT.img',
          'cardetails.fuel':'$$ROOT.fuel',
          'cardetails.make':'$$ROOT.make',
          'cardetails.model':'$$ROOT.model',
          'cardetails.type':'$$ROOT.type',
          'cardetails.location':'$$ROOT.location',
          'cardetails.year':'$$ROOT.year',
          'cardetails.price':'$$ROOT.price',
          'sellerdetails.sid': 1,
          'sellerdetails.name': 1,
          'sellerdetails.phone': 1,
        },
    },
    ])
    res.send(ListofCars)
})


//VerifyCar
app.post('/VerifyCar',async(req,res)=>
{
    const {car_no,sid}=req.body
    await CarModel.updateOne({car_no:car_no,sid:sid},{$set:{isverified:true}})
    
    const sellerdetails=await SellerModel.findOne({sid:sid}).select({email:1,name:1})
    const cardetails=await CarModel.findOne({car_no:car_no}).select({name:1,make:1})

    var mailOptions = {
    from: 'prasannavb04@gmail.com',
    to: `${sellerdetails.email}`,
    subject: 'Congratulations! Your Car is Verified',
    html: `
    <div class="container">
    <p>Dear ${sellerdetails.name},</p>

    <p>We are thrilled to inform you that your car listing has been successfully verified. Congratulations! Your vehicle is now ready to be listed and rented by users on our platform.</p>

    <p>Details:</p>
    <table border>
      <tr>
        <th>Car Number</th>
        <th>Car Model</th>
      </tr>
      <tr>
        <td>${car_no}</td>
        <td>${cardetails.make} ${cardetails.name}</td>
      </tr>
    </table>

    <p>You can now proceed to list your car for rent, allowing users to discover and book it for their upcoming journeys. To begin the listing process, log in to your account and navigate to the car management section on our website.</p>

    <p>If you have any questions or need assistance, feel free to reach out to our support team. Thank you for choosing our platform to share your vehicle with others!</p>

    <p>Best regards,<br>
    DriveEasy<br>
    prasannavb04@gmail.com<br>
  </div>
        `,
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
        console.log(error);
        } else {
        console.log('Email sent: ' + info.response);
        }
    });
    res.send({action:true})
})

//DeleteCar 
app.post('/DeleteCar',async(req,res)=>
{
    const {singlecar,Reason}=req.body

    const sellerdetails=await SellerModel.findOne({sid:singlecar.sid}).select({email:1,name:1})
    const cardetails=await CarModel.findOne({car_no:singlecar.car_no}).select({name:1,make:1,car_no:1})
    await CarModel.deleteOne({car_no:singlecar.car_no,sid:singlecar.sid})

    var mailOptions = {
    from: 'prasannavb04@gmail.com',
    to: `${sellerdetails.email}`,
    subject: 'Your Car Listing Has Been Rejected',
    html: `
        <div class="container">
        <p>Dear ${sellerdetails.name},</p>
    
        <p>We regret to inform you that your car listing has been rejected due to the following reasons:</p>
        <ul>
            <li>Car Number:${singlecar.car_no}</li>
            <li>Car Details:${cardetails.make} ${cardetails.name}</li>
            <li>Reason:${Reason}</li>
        </ul>
    
        <p>We understand that this might be disappointing, and we appreciate your effort in listing your car on our platform. To enhance your chances of approval, please review the provided reasons and make the necessary adjustments to your listing.</p>
    
        <p>If you have any questions or need further clarification, don't hesitate to reach out to our support team. We are here to assist you in creating a successful car listing.</p>
    
        <p>Thank you for your understanding and cooperation.</p>
    
    <p>Best regards,<br>
    DriveEasy<br>
    prasannavb04@gmail.com<br>
  </div>
     `,
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
    });
    res.send({action:true})
})

//CardCount
app.get('/ActiveCount',async(req,res)=>
{
    const verified=await CarModel.find({isverified:true}).count()
    const unverified=await CarModel.find({isverified:false}).count()
    const total=verified+unverified
    const Bookings=await BookingModel.find().count() + await PastBookingModel.find().count()
    res.send({verified,unverified,total,Bookings})
}) 

//FiltersMetaData

app.get("/FiltersMetaData",async(req,res)=>{
    const FiltersMetaData=await CarMetaData.find({})
    res.send(FiltersMetaData)
})

//UpdateMetaData
app.post('/UpdateMetaData',async(req,res)=>
{
    const {Fuel,Make,Model,Type,FormDetails}=req.body
    if(FormDetails.Fuel!=='')
    {
        const fuels={fuel:FormDetails.Fuel,id:Fuel[Fuel.length-1].id+1}
        Fuel.push(fuels)
    }
    if(FormDetails.Make!=='')
    {
        const makes={make:FormDetails.Make,id:Make[Make.length-1].id+1}
        Make.push(makes)
    }
    if(FormDetails.Model!=='')
    {
        const models={model:FormDetails.Model,id:Model[Model.length-1].id+1}
        Model.push(models)
    }
    if(FormDetails.Type!=='')
    {
        const types={type:FormDetails.Type,id:Type[Type.length-1].id+1}
        Type.push(types)
    }
  await CarMetaData.updateMany({
      $set: {
          Fuel: Fuel,
          Model: Model,
          Make: Make,
          Type: Type,
      },
  });
  res.send({action:true})
})

//GenerateCouponCode
app.post('/GenerateCouponCode',async(req,res)=>
{
  const {Discount,couponCode}=req.body
  await CouponModel.insertMany({code:couponCode,Discount:Discount})
  res.send({action:true})
})