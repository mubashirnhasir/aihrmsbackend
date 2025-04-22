const nodemailer = require("nodemailer")
const Mailgen = require("mailgen")


// var mailGenerator = new Mailgen({
//     theme: 'default',
//     product: {
//         // Appears in header & footer of e-mails
//         name: 'Mailgen',
//         link: 'https://mailgen.js/'
//         // Optional product logo
//         // logo: 'https://mailgen.js/img/logo.png'
//     }
// });

const sendOtpEmail = async(email ,name, otp)=>{
    const mailGenerator = new Mailgen({
            theme: 'default',
            product: {
                name: 'HRMS',
                link: 'https://github.com/mubashirnhasir'
                // Optional product logo
                // logo: 'https://mailgen.js/img/logo.png'
            }
        });

    const emailContent = {
        body: {
            name: name || "User",
            intro: "Welcome to Synapt HRMS!! Here is your OTP to reset password",
            action: {
                instructions: 'To get started with Mailgen, please click here:',
                button: {
                    color: "#22BC66",
                    text: `Your OTP: ${otp}`,
                    link: "https://github.com/mubashirnhasir"
                  }
            },
            outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
        }
    }

    const emailBody = mailGenerator.generate(emailContent)
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth:{
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP for Reset password",
        html: emailBody
    })
        
}



module.exports = sendOtpEmail

