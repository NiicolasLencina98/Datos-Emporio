const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta principal - formulario
app.get("/", (req, res) => {
  res.render("formulario", { data: {}, errors: {} });
});

// Validación de formulario
function validateForm(data) {
  let errors = {};
  const requiredFields = [
    "nombre",
    "estado_civil",
    "calle",
    "numero",
    "cp",
    "barrio",
    "localidad",
    "provincia",
    "entre_calles",
    "celular",
    "email"
  ];
  requiredFields.forEach(field => {
    if (!data[field] || data[field].trim() === "") {
      errors[field] = "Este campo es obligatorio";
    }
  });
  return errors;
}

// Manejar envío del formulario
app.post("/enviar", (req, res) => {
  const data = req.body;
  const errors = validateForm(data);

  if (Object.keys(errors).length > 0) {
    return res.render("formulario", { data, errors });
  }

  const pdfPath = path.join(__dirname, "public", "datos.pdf");
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Logo
  const logoPath = path.join(__dirname, "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 450, 20, { width: 100 });
  }

  // Título
  doc.fontSize(18).text("Actualización de Datos", { align: "center" });
  doc.moveDown(1);

  // Línea separadora
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(1);

  // Datos Personales
  doc.fontSize(14).text("Datos Personales", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12)
    .text(`Apellido y Nombre: ${data.nombre || "-"}`)
    .text(`Estado Civil: ${data.estado_civil || "-"}`)
    .text(`Dirección: ${data.calle || "-"} ${data.numero || "-"}, Piso: ${data.piso || "-"}, Depto: ${data.depto || "-"}`)
    .text(`Código Postal: ${data.cp || "-"} | Barrio: ${data.barrio || "-"} | Localidad: ${data.localidad || "-"} | Provincia: ${data.provincia || "-"}`)
    .text(`Entre Calles: ${data.entre_calles || "-"}`);
  doc.moveDown(1);

  // Datos de Contacto
  doc.fontSize(14).text("Datos de Contacto", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12)
    .text(`Celular: ${data.celular || "-"}`)
    .text(`Email: ${data.email || "-"}`)
    .text(`Tel. Emergencia: ${data.tel_emergencia || "-"}`)
    .text(`Nombre Persona Emergencia: ${data.nombre_emergencia || "-"}`)
    .text(`Parentesco: ${data.parentesco_emergencia || "-"}`);
  doc.moveDown(1);

  // Datos Familiares
  doc.fontSize(14).text("Datos Familiares", { underline: true });
  doc.moveDown(0.5);

  if (data.familiares && Array.isArray(data.familiares) && data.familiares.length > 0) {
    data.familiares.forEach((f, i) => {
      if (f.nombre || f.parentesco || f.fecha_nacimiento || f.dni) {
        doc.fontSize(12).text(`${i + 1}. ${f.nombre || "-"} | ${f.parentesco || "-"} | ${f.fecha_nacimiento || "-"} | DNI: ${f.dni || "-"}`);
      }
    });
  } else {
    doc.fontSize(12).text("No se ingresaron datos familiares.");
  }
  doc.moveDown(1);

  // Nivel de Estudio
  doc.fontSize(14).text("Nivel de Estudio", { underline: true });
  doc.moveDown(0.5);

  const estudios = [
    { nombre: "Primario", estado: data.primario_estado, titulo: "" },
    { nombre: "Secundario", estado: data.secundario_estado, titulo: data.secundario_titulo },
    { nombre: "Terciario", estado: data.terciario_estado, titulo: data.terciario_titulo },
    { nombre: "Universitario", estado: data.universitario_estado, titulo: data.universitario_titulo }
  ];

  estudios.forEach(est => {
    doc.fontSize(12).text(`${est.nombre}: ${est.estado || "-"}${est.titulo ? " | Título: " + est.titulo : ""}`);
  });

  doc.moveDown(1);
  doc.fontSize(12).text(`Otros cursos: ${data.otros_cursos || "-"}`);
  doc.fontSize(12).text(`Otras habilidades: ${data.otras_habilidades || "-"}`);
  doc.moveDown(2);

  // Firma
  const startY = doc.y + 40;
  const lineLength = 150;
  doc.moveTo(50, startY).lineTo(50 + lineLength, startY).stroke();
  doc.text("Firma", 50, startY + 5);

  doc.moveTo(220, startY).lineTo(220 + lineLength, startY).stroke();
  doc.text("Aclaración", 220, startY + 5);

  doc.moveTo(390, startY).lineTo(390 + lineLength, startY).stroke();
  doc.text("DNI", 390, startY + 5);

  // Pie de página
  doc.fontSize(8)
    .text("Empresa XYZ - Dirección - Teléfono", 50, 780, {
      align: "center",
      width: doc.page.width - 100
    });

  doc.end();

  writeStream.on("finish", () => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "niicolas.emporiio@gmail.com",
        pass: "hmnm kaqb usvo eyvx"
      }
    });

    const mailOptions = {
      from: "niicolas.emporiio@gmail.com",
      to: "niicolas.emporiio@gmail.com",
      subject: `ACTUALIZACION DE DATOS - ${data.nombre}`,
      text: "Se adjunta el PDF con la actualización de datos.",
      attachments: [{ filename: "datos.pdf", path: pdfPath }]
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error("Error enviando el email:", err);
        return res.send("Ocurrió un error al enviar el email.");
      }

      res.render("confirmacion", { nombre: data.nombre });
    });
  });
});

app.listen(3000, () => {
  console.log("Servidor ejecutándose en http://localhost:3000");
});
