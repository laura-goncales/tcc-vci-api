const express = require("express");
const bodyParser = require("body-parser");
const User = require("../database/models/users");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { route } = require("./login");
const router = express.Router();
const jsonParser = bodyParser.json();
const sendMail = require("../src/email");
const authToken = require("../src/authToken");
router.use(jsonParser);
router.get("/all", async function (req, res) {
    try {
        User.findAll()
            .then(function (resultados) {
                res.json(resultados);
            })
            .catch(function () {
                throw new Error("Erro ao procurar todos os usuários");
            });
    } catch (e) {
        res.json({
            success: false,
            message: e.message
        });
    }
});

router.get("/checked-users", async function (req, res) {
    try {
        User.findAll({
            order: ["checked_user"],
        })
            .then(function (resultados) {
                res.json(resultados);
            })
            .catch(function () {
                throw new Error("Erro ao procurar todos os usuários");
            });
    } catch (e) {
        res.json({
            success: false,
            message: e.message
        });
    }
});

router.get("/ids", async function (req, res, next) {
    try {
        const result = await User.findAll({
            where: {
                iduser: req.body.ids
            }
        });
        if (result.length > 0) {
            res.json(result);
        } else {
            throw new Error("Ids inexistentes");
        }
    } catch (e) {
        res.json({
            success: false,
            message: e.message
        });
    }
});
router.get("/admins", jsonParser, async function (req, res, next) {
    try {
        const result = await User.findAll({
            where: {
                admin: true
            }
        });
        console.log(result);
        if (result.length > 0) {
            res.json(result);
        } else {
            throw new Error("Admins inexistentes");
        }
    } catch (e) {
        res.json({
            success: false,
            message: e.message
        });
    }
});
router.get("/employee", jsonParser, async function (req, res, next) {
    try {
        const result = await User.findAll({
            where: {
                admin: false
            }
        });
        console.log(result);
        if (result.length > 0) {
            res.json(result);
        } else {
            throw new Error("Funcionários inexistentes");
        }
    } catch (e) {
        res.json({
            success: false,
            message: e.message
        });
    }
});
router.get("/:id", jsonParser, async function (req, res, next) {
    try {
        const result = await User.findAll({
            where: {
                iduser: req.params.id
            }
        });
        if (result.length > 0) {
            res.json(result);
        } else {
            throw new Error("Erro ao procurar usuário pelo id");
        }
    } catch (e) {
        res.json({
            success: false,
            message: e.message
        });
    }
});
router.post(async function (req, res, next) {
    console.log(req);
    return;
});
router.post("/", async function (req, res, next) {
    try {
        const dados = req.body;
        const salt = bcrypt.genSaltSync(12);
        dados.password = bcrypt.hashSync(dados.cpf, salt);
        dados.nickname =
            dados.nome.charAt(0).toUpperCase() + dados.sobrenome.split(" ")[0];
        dados.nome += " " + dados.sobrenome;
        dados.admin ? "" : (dados.admin = false);
        const result = await User.create({
            // tratar melhor todos os erros, esta com muita brecha ainda
            name_user: dados.nome,
            nickname_user: dados.nickname,
            email_user: dados.email,
            cpf_user: dados.cpf,
            password_user: dados.password,
            admin: dados.admin
        });
        if (result !== null) {
            console.log("Enviando email");
            sendMail(
                dados.email,
                "Bem-vindo ao VCI Treinamentos!",
                `Olá ${dados.nome}, verificamos que você se cadastrou no nosso sistema de treinamentos, seja bem-vindo!<br /><br />
                 Seus dados para login são:<br/>
                 Nome de usuário: ${dados.nickname}<br/>
                 Senha: sua senha é o seu CPF. Lembre-se de digitar os pontos (.) e hífen (-). <br/><br/> 
                 Atenciosamente, Equipe VCI.`
            );
            res.json({
                success: true,
                result: result
            });
        } else {
            throw new Error("Erro ao criar usuário");
        }
    } catch (e) {
        res.json({
            sucess: false,
            message: e.message,
            error: e.parent
        });
    }
});
router.post("/email", async function (req, res) {
    var dados = req.body;
    sendMail(dados.destinatario, dados.assunto, dados.texto);
});
router.post("/forgot-password", async function (req, res, next) {
    var dados = req.body;
    var result = await User.findOne({
        where: {
            email_user: dados.email
        }
    });
    if (result != null) {
        const response = await sendMail(
            dados.email,
            "Esqueci minha senha",
            "Olá, sua senha do treinamento da empresa VCI é : " +
                result.cpf_user
        ); // pode melhorar com um html
        if (response) {
            res.status(200).json({
                success: true,
                message: "E-mail enviado com sucesso"
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Erro ao enviar e-mail"
            });
        }
    } else {
        res.status(404).json({
            success: false,
            message: "E-mail não encontrado em nossa base de dados"
        });
    }
});
router.post("/save-image-user", authToken, async function (req, res, next) {
    let dados = req.body;
    jwt.verify(dados.tk, process.env.STRING_TOKEN_ENCODE, function (
        err,
        decoded
    ) {
        User.update(
            {
                path_image: `assets/images/users/${decoded.iduser}.jpg`
            },
            {
                where: {
                    iduser: decoded.iduser
                }
            }
        ).then(function (result) {
            if (result[0] === 1) {
                res.status(200).json({
                    success: true,
                    message: "Imagem alterada com sucesso.",
                    data: result
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: "Erro ao alterar a imagem, tente novamente"
                });
            }
        });
    });
});
router.put("/check-user/:email", async function (req, res, next) {
    const email = req.params.email;
    const dados = req.body;
    console.log(dados);
    let itens = {
        checked_user: true
    };
    User.update(itens, { where: { email_user: email } }).then(
        (result) => {
            if (result[0] === 1) {
                sendMail(
                    email,
                    "Verificação de cadastro!",
                    `Olá ${dados.name}, a verificação da sua conta foi realizada! Agora você já pode se logar em nosso sistema!<br /><br />
                     Relembrando, seus dados para login são:<br/>
                     Nome de usuário: ${dados.nickname}<br/>
                     Senha: sua senha é o seu CPF. Lembre-se de digitar os pontos (.) e hífen (-). <br/><br/> 
                     Atenciosamente, Equipe VCI.`
                );
                res.json({
                    success: true,
                    message: "Usuário verificado com sucesso"
                });
            }
        }
    );
});
router.put("/promote-admin/:email", async function (req, res, next) {
    const email = req.params.email;
    const dados = req.body;
    console.log(dados);
    let itens = {
        admin: true
    };
    User.update(itens, { where: { email_user: email } }).then(
        (result) => {
            if (result[0] === 1) {
                sendMail(
                    email,
                    "Promovido a administrador!",
                    `Olá ${dados.name}, você foi promovido a administrador! Em seu próximo login, você já terá acesso a páginas exclusivas!<br /><br /> 
                     Atenciosamente, Equipe VCI.`
                );
                res.json({
                    success: true,
                    message: "Usuário promovido com sucesso"
                });
            }
        }
    );
});
router.put("/update-user", async function (req, res, next) {
    const dados = req.params;
    let itens = {
        name_user: dados.nome,
        email_user: dados.email,
        nickname_user:
            dados.nome.charAt(0).toUpperCase() + dados.nome.split(" ")[1]
    };
    User.update(itens, { where: { iduser: dados.iduser } }).then((result) => {
        if (result[0] === 1) {
            sendMail(
                dados.email,
                "Alteração de dados",
                `Olá ${dados.nome}, verificamos que você realizou uma alteração em seus dados pessoais no nosso sistema.<br /><br />
                     Seus dados atuais são:<br/>
                     Nome de usuário: ${dados.nickname}<br/>
                     Nome: ${dados.nome}<br/>
                     E-mail: ${dados.email}<br/>
                     Senha: sua senha é o seu CPF. Lembre-se de digitar os pontos (.) e hífen (-). <br/><br/> 
                     Atenciosamente, Equipe VCI.`
            );
            res.json({
                success: true,
                message: "Dados alterados com sucesso!"
            });
        }
    });
});

module.exports = router;
