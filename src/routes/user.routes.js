import { Router } from "express";
import { loginUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";

const router = Router()

router.get('/register', (req, res) => {
    res.render('register');
});


router.route("/register").post(
    registerUser
)

router.get('/login', (req, res) =>{
    res.render('login')
})

router.route("/login").post(loginUser)


// router.route("/login").post(
//     loginUser
// )


// //secured routes
// router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router;