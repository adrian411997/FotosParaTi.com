const path = require("path");
const fs = require("fs");
const { ClientRequest } = require("http");

/**
 * SesionController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
  inicioSesion: async (peticion, respuesta) => {
    if (peticion.session.admin) {
      peticion.session.admin = undefined;
    } //Para que el admin no vaya al (/), la unica manera de llegar es cerrando sesion
    respuesta.view("pages/admin/inicio_sesion");
  },

  procesarInicioSesion: async (peticion, respuesta) => {
    let admin = await Admin.findOne({
      email: peticion.body.email,
      contrasena: peticion.body.contrasena,
    });
    if (admin) {
      if (!admin.activo) {
        peticion.addFlash(
          "mensaje",
          "Cuenta Admin desactivado, contacte a otro administrador para resolver este problema"
        );
        return respuesta.redirect("/admin/inicio-sesion");
      } else {
        peticion.session.admin = admin;
        console.log(peticion.session.admin);
        peticion.session.cliente = undefined;
        peticion.addFlash("mensaje", "Sesión de admin iniciada");
        return respuesta.redirect("/admin/principal");
      }
    } else {
      peticion.addFlash("mensaje", "Email o contraseña invalidos");
      return respuesta.redirect("/admin/inicio-sesion");
    }
  },

  principal: async (peticion, respuesta) => {
    if (!peticion.session || !peticion.session.admin) {
      peticion.addFlash("mensaje", "Sesión inválida");
      return respuesta.redirect("/admin/inicio-sesion");
    }

    let fotos = await Foto.find().sort("id");
    let clientes = await Client.find().sort("id");

    let admins = await Admin.find().sort("id");
    let orders = await Orden.find();
    let session = peticion.session;
    respuesta.view("pages/admin/principal", {
      fotos,
      clientes,
      admins,
      ordenes: orders,
      session,
    });
  },

  cerrarSesion: async (peticion, respuesta) => {
    peticion.session.admin = undefined;
    peticion.addFlash("mensaje", "Sesión finalizada");
    return respuesta.redirect("/");
  },

  agregarFoto: async (peticion, respuesta) => {
    respuesta.view("pages/admin/agregar_foto");
  },

  procesarAgregarFoto: async (peticion, respuesta) => {
    let foto = await Foto.create({
      titulo: peticion.body.titulo,
      activa: true,
    }).fetch();
    peticion.file("foto").upload({}, async (error, archivos) => {
      if (archivos && archivos[0]) {
        let upload_path = archivos[0].fd;
        let ext = path.extname(upload_path);

        await fs
          .createReadStream(upload_path)
          .pipe(
            fs.createWriteStream(
              path.resolve(
                sails.config.appPath,
                `assets/images/fotos/${foto.id}${ext}`
              )
            )
          );
        await Foto.update({ id: foto.id }, { contenido: `${foto.id}${ext}` });
        peticion.addFlash("mensaje", "Foto agregada");
        return respuesta.redirect("/admin/principal");
      }
      peticion.addFlash("mensaje", "No hay foto seleccionada");
      return respuesta.redirect("/admin/agregar-foto");
    });
  },

  desactivarFoto: async (peticion, respuesta) => {
    await Foto.update({ id: peticion.params.fotoId }, { activa: false });
    peticion.addFlash("mensaje", "Foto desactivada");
    return respuesta.redirect("/admin/principal");
  },

  activarFoto: async (peticion, respuesta) => {
    await Foto.update({ id: peticion.params.fotoId }, { activa: true });
    peticion.addFlash("mensaje", "Foto activada");
    return respuesta.redirect("/admin/principal");
  },
  desactivarClient: async (req, res) => {
    await Client.update({ id: req.params.id }, { activo: false });
    req.addFlash("mensaje", "Usuario desactivado");
    return res.redirect("/admin/principal");
  },
  activarClient: async (req, res) => {
    await Client.update({ id: req.params.id }, { activo: true });
    req.addFlash("mensaje", "Usuario activado");
    return res.redirect("/admin/principal");
  },
  viewOrden: async (req, res) => {
    let cliente = await Orden.find({ cliente: req.params.id });
    return res.view("pages/admin/ordenes", { ordenes: cliente });
  },
  viewDetail: async (req, res) => {
    let details = await OrdenDetalle.find({ orden: req.params.id });
    console.log(details);
    return res.view("pages/admin/orden-detalle", { details });
  },
  desactivarAdmin: async (req, res) => {
    await Admin.update({ id: req.params.id }, { activo: false });
    req.addFlash("mensaje", "Administrador desactivado");
    return res.redirect("/admin/principal");
  },
  activarAdmin: async (req, res) => {
    await Admin.update({ id: req.params.id }, { activo: true });
    req.addFlash("mensaje", "Administrador activado");
    return res.redirect("/admin/principal");
  },
  showDashboard: async (req, res) => {
    if (req.session.admin) {
      let clientes = await Client.find();
      let fotos = await Foto.find();
      let ordenes = await Orden.find();
      let admin = await Admin.find();
      return res.view("pages/admin/dashboard", {
        clientes,
        fotos,
        ordenes,
        admin,
      });
    }
  },
};
