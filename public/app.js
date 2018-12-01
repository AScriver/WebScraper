

$(".article-btn-save").on("click", function(){

  var thisId = $(this).attr("data-id");

  $.ajax({
    method: "POST",
    url: "/saved/" + thisId,
    data: {
      saved: true,
      id: thisId
    }
  }).then(function(data){
    window.location.replace("/");
  })
})

$(".article-btn-unsave").on("click", function(){
  var thisId = $(this).attr("data-id");

  $.ajax({
    method: "POST",
    url: "/unsaved/" + thisId,
    data: {
      saved: false,
      id: thisId
    }
  }).then(function(data){
    window.location.replace("/saved");
  })
})

$(document).on("click", ".article-btn-comment", function (e) {
  e.preventDefault();
  $("#notes").empty();
  var thisId = $(this).attr("data-id");

  $.ajax({
      method: "GET",
      url: "/articles/" + thisId
    })
    .then(function (data) {
      console.log(data);
      $("#notes").append("<input class='form-control' id='titleinput' name='title' placeholder='Name:'>");
      $("#notes").append("<textarea class='form-control' id='bodyinput' name='body'></textarea>");
      $("#notes").append("<a href='' data-id='" + data._id + "' id='savenote'>Save Note</a>");

      if (data.note) {
        $("#titleinput").val(data.note.title);
        $("#bodyinput").val(data.note.body);
      }
    });
});

$(document).on("click", "#savenote", function () {
  var thisId = $(this).attr("data-id");

  $.ajax({
      method: "POST",
      url: "/articles/" + thisId,
      data: {
        title: $("#titleinput").val(),
        body: $("#bodyinput").val()
      }
    })
    .then(function (data) {
      console.log("data");
      $("#notes").empty();
    });

  $("#titleinput").val("");
  $("#bodyinput").val("");
});
