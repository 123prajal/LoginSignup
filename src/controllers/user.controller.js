import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens =  async(userId) => {
    try {
        const user = await User.findById(userId)
        const refreshToken = user.generateRefreshToken()
        const accessToken = user.generateAccessToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}





    } catch (error) {
        throw new ApiError(500, "something went wrong while geenratine refresh and access token")
        
    }
}



const registerUser = asyncHandler( async (req, res) => {

    const {email, password, confirm_password} = req.body
    console.log("email: ", email)

    if(password !== confirm_password){
        return res.json({error: "Passwords didn't match"})
    }

    if (
        [ email,  password].some((field) => 
        field?.trim() === "")
    ){
        throw new ApiError(400, "Email and Password are required")
    }

    const existedUser = await User.findOne({email}
    )

    if (existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    console.log(req.files)

    const user = await User.create({
        email,
        password

    })

    const createdUSer = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUSer){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.redirect('/api/v1/users/login')
})

const loginUser = asyncHandler( async (req, res) => {{
    const {email, password} = req.body
    console.log(email);

    if (!(email) ){
        throw new ApiError(400, "email is required")
    }

    const user = await User.findOne({email
    })

    if(!user){
        throw new ApiError(404, "User doesn't exist")
    
    }

    const isPasswordValid = await user.comparePassword(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Pasword incorrect ")
    }

    const {refreshToken, accessToken} = await 
    generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200).render('index')
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in Succesfully"
        )
    )
    
 


}})

// const logoutUser = asyncHandler(async(req, res)=>{
//     await User.findByIdAndUpdate(
//         req.user._id,
//         {
//             $set: {
//                 refreshToken: undefined
//             }
//         },
//         {
//             new: true
//         }

//     )
//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res
//     .status(200)
//     .clearCookie("accessToken", options)
//     .clearCookie("refreshToken", options)
//     .json(new ApiResponse(200, {}, "User logged Out Successfully"))
// })

const refreshAccessToken = asyncHandler(async (req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorised request")
    }

try {
    
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.
            REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, 
                {accessToken, newRefreshToken},
                "Access token refreshed"
            )
        )
} catch (error) {
    throw new ApiError(401, error?.message | "Invalid refresh token")
    
}
})

export {
    registerUser, refreshAccessToken, loginUser
};

