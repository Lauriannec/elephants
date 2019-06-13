window.onbeforeunload = function() {
  window.scrollTo(0, 0);
};

let margin = { top: 20, right: 80, bottom: 70, left: 80 };
let selected_province;
let selected_province_text;
let y_axis;
let y_label;
let svg;
let legende_texte;

let province_code = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NS: "Nova Scotia",
  ON: "Ontario",
  QC: "Quebec",
  SK: "Saskatchewan"
};

const minRadius = 4.5;
const maxRadius = 18;

let legend_format = d3.format(".2s");

const orange_color = "#b24800";
const green_color = "#496b3b";
const dark_grey = "#282828";
const background_color = "#f7f7f7";

function reset_chart() {
  if (svg != null) {
    d3.select("#dataviz").remove();
  }
}

function get_para_to_show(selected_province) {
  let list_of_paras = {
    second_graph: "#para_" + selected_province + "_fonction1",
    third_graph: "#para_" + selected_province + "_fonction2",
    load_part_2: "#para_" + selected_province + "_fonction3",
    load_part_3: "#para_" + selected_province + "_fonction4"
  };

  let decision_object = {};
  for (let para_name in list_of_paras) {
    para_object = document.querySelector(list_of_paras[para_name]);
    if (para_object != null) {
      let position_para = para_object.getBoundingClientRect().y;
      if (position_para < 0) {
        decision_object[para_name] = position_para;
      }
    }
  }

  if (Object.keys(decision_object).length > 0) {
    para_final = Object.keys(decision_object).reduce(function(a, b) {
      return decision_object[a] > decision_object[b] ? a : b;
    });
    return para_final;
  }
  return "";
}

let clicks = 0;

$(function() {
  $(".provinces").click(function() {
    if (clicks == 0){
    selected_province = $(this).data("province");
    selected_province_text = "content" + selected_province;
    selected_province_canada_analysis = "canada_analysis_" + selected_province;

    $("#" + selected_province_text).show();
    $("#" + selected_province_canada_analysis).show();

    $(".provinces")
      .not(this)
      .hide();

    load_content(selected_province);
  } else{
    $(".provinces").show();
    reset_chart();
}
++clicks;
  });
});

function load_content() {
  d3.select("#dataviz");

  d3.csv("dataset_w_aboriginal.csv").then(function(data) {
    console.log(data)
    data = data.filter(function(d) {
      return d["province_name"] == province_code[selected_province];
    });
    data = data.map(function(d) {
      let premieres_nations = false;
      if (
        d["csd_type"] == ["Indian reserve"] ||
        d["csd_type"] == ["Indian government district"] ||
        d["csd_type"] == ["Indian Settlement"] ||
        d["csd_type"] == ["Nisga'a land"] ||
        d["csd_type"] == ["Terres reservees aux Cris"] ||
        d["csd_type"] == ["Terres reservees aux Naskapis"]
      ) {
        premieres_nations = true;
      }
      return {
        csd_code: d["csd_code"],
        csd_name: d["csd_name"],
        csd_type: d["csd_type"],
        cwb_index: parseFloat(d["cwb_index"]),
        dwellings_index: parseFloat(d["dwellings_index"]),
        education_index: parseFloat(d["education_index"]),
        income_index: parseFloat(d["income_index"]),
        labour_index: parseFloat(d["labour_index"]),
        population_count: parseInt(d["population_count"]),
        province_name: d["province_name"],
        premieres_nations: premieres_nations
      };
    });

    let previous_para = "";

    window.addEventListener(
      "scroll",
      _.throttle(function() {
        let para_to_show = get_para_to_show(selected_province);
        if (para_to_show == previous_para) {
          return false;
        }

        if (para_to_show == "second_graph") {
          show_indigenous();
          console.log("show_indigenous()");
        } else if (para_to_show == "third_graph") {
          right_left();
          console.log("right_left()");
        } else if (para_to_show == "load_part_2") {
          medians();
          reset_svg2();
          four_indexes();
          console.log("medians() and four_indexes()");
        } else if (para_to_show == "load_part_3") {
          reset_svg3();
          canada();
          console.log("canada()");
        }
        previous_para = para_to_show;
      }, 50)
    );

    let valeur_min_max = d3.extent(data, function(d) {
      return d["cwb_index"];
    });
    console.log(valeur_min_max);

    let min_max_pop = d3.extent(data, function(d) {
      return d["population_count"];
    });

    // -------- FIRST FUNCTION -------- //

    let boundrect = document
      .querySelector("#dataviz_wrapper")
      .getBoundingClientRect();

    let width = boundrect.width - margin.left - margin.right;
    let height = boundrect.height - margin.top - margin.bottom;

    let echelle_x = d3
      .scaleLinear()
      .range([margin.right, width - margin.right])
      .domain([0, 100]);

    let echelle_y = d3
      .scaleLinear()
      .range([height - margin.bottom, margin.top])
      .domain(valeur_min_max);

    let echelle_r = d3
      .scaleSqrt()
      .range([minRadius, maxRadius])
      .domain(min_max_pop);

    svg = d3
      .select("#dataviz")
      .attr("width", width)
      .attr("height", height)
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Y AXIS
    if (".y_axis" != null) {
      svg.select(".y_axis").remove();
    }
    svg
      .append("g")
      .attr("class", "y_axis")
      .transition()
      .duration(1000)
      .delay(function(d, i) {
        return i;
      })
      .attr("y", margin.left)
      .attr("x", margin.bottom)
      .attr("transform", "translate(" + 50 + ",0" + ")")
      .call(d3.axisLeft(echelle_y).ticks(6));

    // Y LABEL
    if (".y_label" != null) {
      svg.select(".y_label").remove();
    }
    svg
      .append("g")
      .attr("class", "y_label")
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .attr("text-anchor", "middle")
      .text("Community Well Being Index");

    // Prepare circles
    svg
      .selectAll(".subdiv")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "subdiv")
      .attr("r", 0)
      .style("fill", green_color);

    // Show circles
    svg
      .selectAll(".subdiv")
      .attr("cx", function(d) {
        return echelle_x(d3.randomUniform(0, 100)());
      })
      .attr("cy", function(d) {
        return echelle_y(d["cwb_index"]);
      })
      .transition()
      .duration(800)
      .delay(function(d, i) {
        return i;
      })
      .attr("r", function(d) {
        return echelle_r(d["population_count"]);
      })
      .style("fill", green_color)
      .attr("opacity", 0.5)
      .style("cursor", "pointer");

    // LEGEND
    svg
      .append("g")
      .attr("class", "legende_texte")
      .append("text")
      .attr("y", margin.top / 2)
      .attr("x", width - margin.right / 3)
      .attr("text-anchor", "middle")
      .attr("font-size", "11.5px")
      .attr("opacity", 0)
      .transition()
      .duration(2000)
      .delay(function(d, i) {
        return i;
      })
      .attr("opacity", 1)
      .text("Population");

    svg
      .selectAll(".legende_circle")
      .data(min_max_pop)
      .enter()
      .append("circle")
      .attr("class", "legende_circle")
      .attr("fill", "transparent")
      .attr("cy", function(d) {
        return margin.top * 3.5 - echelle_r(d);
      })
      .attr("cx", width - margin.right / 3)
      .attr("r", function(d) {
        return echelle_r(d);
      })
      .attr("opacity", 0)
      .transition()
      .duration(2000)
      .delay(function(d, i) {
        return i;
      })
      .attr("stroke", dark_grey)
      .attr("stroke-width", 0.75)
      .attr("opacity", 1);

    svg
      .append("g")
      .attr("class", "legende_texte")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("opacity", 0)
      .attr("y", margin.top * 3.5 - (minRadius * 2 + 3))
      .attr("x", width - margin.right / 3)
      .transition()
      .duration(2000)
      .delay(function(d, i) {
        return i;
      })
      .text(legend_format(min_max_pop[0]))
      .attr("opacity", 1);

    svg
      .append("g")
      .attr("class", "legende_texte")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("opacity", 0)
      .attr("y", margin.top * 3.5 - (maxRadius * 2 + 3))
      .attr("x", width - margin.right / 3)
      .transition()
      .duration(2000)
      .delay(function(d, i) {
        return i;
      })
      .text(legend_format(min_max_pop[1]))
      .attr("opacity", 1);

    // TOOLTIP
    let hauteur_texte = 12;
    let hauteur_tooltip = hauteur_texte * 2 + 14;

    svg
      .append("rect")
      .attr("id", "rect_tooltip")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 0)
      .attr("height", hauteur_tooltip)
      .attr("fill", background_color)
      .attr("stroke", dark_grey)
      .attr("stroke-width", 0.3)
      .attr("opacity", 0);

    svg
      .append("text")
      .append("tspan")
      .text("")
      .attr("id", "name_tooltip")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "ideographic")
      .attr("x", 0)
      .attr("y", 0)
      .attr("font-size", hauteur_texte);

    svg
      .append("text")
      .append("tspan")
      .text("")
      .attr("id", "cwb_tooltip")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "hanging")
      .attr("x", 0)
      .attr("y", 0)
      .attr("font-size", hauteur_texte);

    svg.selectAll(".subdiv").on("mouseover", function(d) {
      let largeur_tooltip = d["csd_name"].length * 5 + 50;
      let posi_x = d3.select(this).attr("cx");
      let posi_y =
        d3.select(this).attr("cy") -
        echelle_r(d["population_count"]) -
        5 -
        hauteur_tooltip / 2;

      svg
        .select("#name_tooltip")
        .text(d["csd_name"])
        .attr("x", posi_x)
        .attr("y", posi_y);

      svg
        .select("#cwb_tooltip")
        .text("CWBI : " + parseInt(d["cwb_index"]))
        .attr("x", posi_x)
        .attr("y", posi_y + 2);

      svg
        .select("#rect_tooltip")
        .attr("width", largeur_tooltip)
        .attr("x", posi_x - largeur_tooltip / 2)
        .attr("y", posi_y - hauteur_tooltip / 2)
        .attr("opacity", 0.85);
    });

    svg.selectAll(".subdiv").on("mouseout", function() {
      svg
        .select("#name_tooltip")
        .text("")
        .attr("x", 0)
        .attr("y", 0);

      svg
        .select("#cwb_tooltip")
        .text("")
        .attr("x", 0)
        .attr("y", 0);

      svg
        .select("#rect_tooltip")
        .attr("width", 0)
        .attr("x", 0)
        .attr("y", 0)
        .attr("opacity", 0);
    });

    // -------- DEUXIEME FONCTION -------- //

    function show_indigenous() {
      let svg = d3.select("#dataviz");

      svg
        .selectAll(".subdiv")
        .filter(function(d) {
          return d["premieres_nations"];
        })
        .transition()
        .duration(300)
        .delay(function(d, i) {
          return i;
        })
        .style("fill", background_color)
        .style("stroke", orange_color)
        .attr("opacity", 0.6)
        .transition()
        .duration(300)
        .delay(function(d, i) {
          return i;
        })
        .style("fill", orange_color)
        .attr("opacity", 0.5);
    }

    // -------- TROISIEME FONCTION -------- //

    function right_left() {
      
      // Y AXIS

      svg
        .select(".y_axis")
        .transition()
        .duration(1400)
        .delay(function(d, i) {
          return i;
        })
        .attr("transform", "translate(" + width / 2 + ",0" + ")")
        .call(
          d3
            .axisLeft(echelle_y)
            .ticks(6)
            .tickSizeInner(-8)
            .tickSizeOuter(-8)
        );

      // Y LABEL
      svg
        .select(".y_label")
        .transition()
        .duration(2000)
        .delay(function(d, i) {
          return i;
        })
        .style("fill", "transparent");

      if (d3.select(".y_label2") != null) {
        svg.select(".y_label2").remove();
      }
      svg
        .append("g")
        .attr("class", "y_label2")
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.top - 10)
        .attr("text-anchor", "middle")
        .style("fill", "transparent")
        .text("Community Well Being Index")
        .transition()
        .duration(2400)
        .delay(function(d, i) {
          return i;
        })
        .style("fill", dark_grey);

      // X LABELS

      if ("#x_label_nonindig" != null) {
        svg.select("#x_label_nonindig").remove();
      }

      svg
        .append("g")
        .attr("class", "x_label")
        .attr("id", "x_label_nonindig")
        .append("text")
        .attr("y", height * 0.93)
        .attr("x", width * 0.75 - margin.left - 10)
        .attr("alignment-baseline", "middle")
        .transition()
        .duration(1400)
        .delay(function(d, i) {
          return i;
        })
        .text("Non-Aboriginal Communities");

      if ("#x_label_indig" != null) {
        svg.select("#x_label_indig").remove();
      }
      svg
        .append("g")
        .attr("class", "x_label")
        .attr("id", "x_label_indig")
        .append("text")
        .attr("y", height * 0.93)
        .attr("x", width * 0.25 - margin.left + 10)
        .attr("alignment-baseline", "middle")
        .transition()
        .duration(1400)
        .delay(function(d, i) {
          return i;
        })
        .text("First Nation Communities");

      svg
        .selectAll(".subdiv")
        .filter(function(d) {
          return d["premieres_nations"];
        })
        .transition()
        .duration(1000)
        .delay(function(d, i) {
          return i;
        })
        .attr("cx", function(d) {
          return echelle_x(d3.randomUniform(2, 45)());
        });

      svg
        .selectAll(".subdiv")
        .filter(function(d) {
          return d["premieres_nations"] == false;
        })
        .transition()
        .duration(1000)
        .delay(function(d, i) {
          return i;
        })
        .attr("cx", function(d) {
          return echelle_x(d3.randomUniform(55, 98)());
        });
    }

    // ADD MEDIAN LINES
    function medians() {

      let indigenous_data = data.filter(function(d) {
        return (
          d["premieres_nations"]
        );
      });

      let median_indigenous = d3.median(indigenous_data, function(d) {
        return d["cwb_index"];
      });

      if ("#median_line_indig" != null) {
        svg.select("#median_line_indig").remove();
      }
      svg
        .append("g")
        .attr("class", "median_line")
        .attr("id", "median_line_indig")
        .append("line")
        .attr("stroke", "transparent")
        .attr("x1", margin.left - 11)
        .attr("y1", echelle_y(median_indigenous))
        .attr("x2", width / 2)
        .attr("y2", echelle_y(median_indigenous))
        .transition()
        .duration(2000)
        .delay(function(d, i) {
          return i;
        })
        .attr("stroke-width", 0.2)
        .attr("stroke", dark_grey)
        .style("stroke-dasharray", "3, 3")
        .style("opacity", 0.7);

      if ("#median_text_indig" != null) {
        svg.select("#median_text_indig").remove();
      }
      svg
        .append("g")
        .attr("class", "median_text")
        .attr("id", "median_text_indig")
        .append("text")
        .attr("x", margin.left - 14)
        .attr("y", echelle_y(median_indigenous))
        .style("fill", background_color)
        .transition()
        .duration(2000)
        .delay(function(d, i) {
          return i;
        })
        .attr("text-anchor", "end")
        .attr("alignment-baseline", "middle")
        .text("median")
        .style("fill", dark_grey);

      let nonindigenous_data = data.filter(function(d) {
        return (
          d["premieres_nations"] == false
        );
      });

      let median_nonindigenous = d3.median(nonindigenous_data, function(d) {
        return d["cwb_index"];
      });

      if ("#median_line_nonindig" != null) {
        svg.select("#median_line_nonindig").remove();
      }
      svg
        .append("g")
        .attr("class", "median_line")
        .attr("id", "median_line_nonindig")
        .append("line")
        .attr("stroke", "transparent")
        .attr("x1", width / 2)
        .attr("y1", echelle_y(median_nonindigenous))
        .attr("x2", width - margin.right + 13)
        .attr("y2", echelle_y(median_nonindigenous))
        .transition()
        .duration(2000)
        .delay(function(d, i) {
          return i;
        })
        .attr("stroke-width", 0.2)
        .attr("stroke", dark_grey)
        .style("stroke-dasharray", "3, 3")
        .style("opacity", 0.7);

      if ("#median_text_nonindig" != null) {
        svg.select("#median_text_nonindig").remove();
      }
      svg
        .append("g")
        .attr("class", "median_text")
        .attr("id", "median_text_nonindig")
        .append("text")
        .attr("x", width - margin.right + 16)
        .attr("y", echelle_y(median_nonindigenous))
        .style("fill", background_color)
        .transition()
        .duration(2000)
        .delay(function(d, i) {
          return i;
        })
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .style("fill", dark_grey)
        .text("median");
    }

    // -------- QUATRIEME FONCTION -------- //

    function reset_svg2() {
      $("#fields_parent").show();
      $("#content_dataviz2").show();
      $(".province_to_fill").text(function(d) {
        return (
          "To get a deeper understanding of how " +
          province_code[selected_province] +
          " got its well-being results, here are the four components of the Community Well Being Index, isolated."
        );
      });
    }

    // -------- CINQUIEME FONCTION -------- //

    function four_indexes() {
      margin.top = 0;
      margin.bottom = 30;

      let indexes = {
        dwellings: "dwellings_index",
        education: "education_index",
        income: "income_index",
        labour: "labour_index"
      };

      let selected_field;
      load_four_indexes(selected_field);
      $(".median_text2").hide();
      $(".median_line2").hide();

      $(function() {
        $(".fields").click(function() {
          selected_field = $(this).data("field");
          $(".fields").removeClass("active");
          $(this).addClass("active");
          load_four_indexes(selected_field);
          $(".median_text2").show();
          $(".median_line2").show();
        });
      });

      function load_four_indexes(selected_field) {
        let boundrect2 = document
          .querySelector("#dataviz_wrapper2")
          .getBoundingClientRect();

        let width = boundrect2.width - margin.left - margin.right;
        let height = boundrect2.height - margin.top - margin.bottom;

        let svg = d3
          .select("#dataviz2")
          .attr("width", width)
          .attr("height", height)
          .attr(
            "transform",
            "translate(" + margin.left + "," + margin.top + ")"
          );

        let min_max_selected_field = d3.extent(data, function(d) {
          return d[indexes[selected_field]];
        });

        let echelle_x = d3
          .scaleLinear()
          .range([margin.right, width - margin.right])
          .domain([0, 100]);

        let echelle_y = d3
          .scaleLinear()
          .range([height - margin.bottom, margin.top])
          .domain(min_max_selected_field);

        let echelle_r = d3
          .scaleSqrt()
          .range([4.5, 18])
          .domain(min_max_pop);

        // y_axis
        if (d3.select(".y_axis2") != null) {
          svg.select(".y_axis2").remove();
        }
        svg
          .append("g")
          .attr("class", "y_axis2")
          .attr("y", margin.left)
          .attr("x", margin.bottom)
          .attr("transform", "translate(" + width / 2 + ",0" + ")")
          .transition()
          .duration(1000)
          .delay(function(d, i) {
            return i;
          })
          .call(d3.axisLeft(echelle_y).ticks(5));

        // X LABELS

        if ("#x_label_nonindig2" != null) {
          svg.select("#x_label_nonindig2").remove();
        }

        svg
          .append("g")
          .attr("class", "x_label")
          .attr("id", "x_label_nonindig2")
          .append("text")
          .attr("y", height * 0.97)
          .attr("x", width * 0.75 - margin.left - 10)
          .attr("alignment-baseline", "middle")
          .transition()
          .duration(1400)
          .delay(function(d, i) {
            return i;
          })
          .text("Non-Aboriginal Communities");

        if ("#x_label_indig" != null) {
          svg.select("#x_label_indig2").remove();
        }
        svg
          .append("g")
          .attr("class", "x_label")
          .attr("id", "x_label_indig2")
          .append("text")
          .attr("y", height * 0.97)
          .attr("x", width * 0.25 - margin.left + 10)
          .attr("alignment-baseline", "middle")
          .transition()
          .duration(1400)
          .delay(function(d, i) {
            return i;
          })
          .text("First Nation Communities");

        svg
          .selectAll(".subdiv")
          .filter(function(d) {
            return d["premieres_nations"];
          })
          .transition()
          .duration(1000)
          .delay(function(d, i) {
            return i;
          })
          .attr("cx", function(d) {
            return echelle_x(d3.randomUniform(2, 45)());
          })
          .attr("r", function(d) {
            return echelle_r(d["population_count"]);
          })
          .attr("opacity", 0.5)
          .style("fill", orange_color);

        svg
          .selectAll(".subdiv")
          .filter(function(d) {
            return d["premieres_nations"] == false;
          })
          .transition()
          .duration(1000)
          .delay(function(d, i) {
            return i;
          })
          .attr("cx", function(d) {
            return echelle_x(d3.randomUniform(55, 98)());
          })
          .attr("r", function(d) {
            return echelle_r(d["population_count"]);
          })
          .attr("opacity", 0.5)
          .style("fill", green_color);

        svg
          .selectAll(".subdiv")
          .data(data)
          .enter()
          .append("circle")
          .attr("class", "subdiv")
          .attr("cx", function(d) {
            if (d["premieres_nations"]) {
              return echelle_x(d3.randomUniform(2, 45)());
            } else {
              return echelle_x(d3.randomUniform(55, 98)());
            }
          })
          .attr("r", 0)
          .style("fill", "whitesmoke")
          .style("cursor", "pointer");

        svg
          .selectAll(".subdiv")
          .filter(function(d) {
            return d["premieres_nations"];
          })
          .transition()
          .duration(1000)
          .delay(function(d, i) {
            return i;
          })
          .attr("cy", function(d) {
            return echelle_y(d[indexes[selected_field]]);
          })
          .attr("r", function(d) {
            return echelle_r(d["population_count"]);
          })
          .attr("opacity", 0.5)
          .style("fill", orange_color);

        svg
          .selectAll(".subdiv")
          .filter(function(d) {
            return d["premieres_nations"] == false;
          })
          .transition()
          .duration(1000)
          .delay(function(d, i) {
            return i;
          })
          .attr("cy", function(d) {
            return echelle_y(d[indexes[selected_field]]);
          })
          .attr("r", function(d) {
            return echelle_r(d["population_count"]);
          })
          .attr("opacity", 0.5)
          .style("fill", green_color);

        // Tooltip
        let hauteur_texte = 12;
        let hauteur_tooltip = hauteur_texte * 2 + 16;

        let fields_labels = {
          income: "Income Index",
          dwellings: "Dwellings Index",
          education: "Education Index",
          labour: "Labour Force Index"
        };

        svg
          .append("rect")
          .attr("id", "rect_tooltip")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", 0)
          .attr("height", hauteur_tooltip)
          .attr("fill", background_color)
          .attr("stroke", dark_grey)
          .attr("stroke-width", 0.3)
          .attr("opacity", 0);

        svg
          .append("text")
          .append("tspan")
          .text("")
          .attr("id", "name_tooltip")
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "ideographic")
          .attr("x", 0)
          .attr("y", 0)
          .attr("font-size", hauteur_texte);

        svg
          .append("text")
          .append("tspan")
          .text("")
          .attr("id", "cwb_tooltip")
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "hanging")
          .attr("x", 0)
          .attr("y", 0)
          .attr("font-size", hauteur_texte);

        // Tooltip mouseover
        svg.selectAll(".subdiv").on("mouseover", function(d) {
          let largeur_tooltip =
            (d["csd_name"].length + indexes[selected_field].length) * 5 + 30;

          /*
          let largeur_tooltip = function(d) {
            if (d["csd_name"].length > indexes[selected_field].length) {
              return d["csd_name"].length * 5 + 50;
            } else {
              return indexes[selected_field].length * 5 + 50;
            }
          }
          */

          let posi_x = d3.select(this).attr("cx");

          let posi_y =
            d3.select(this).attr("cy") -
            echelle_r(d["population_count"]) -
            5 -
            hauteur_tooltip / 2;

          /*
          ------ TOOLTIP > 70 -------
          
          if (d[indexes[selected_field]] >= 70) {
            let posi_y =
              d3.select(this).attr("cy") -
              echelle_r(d["population_count"]) +
              hauteur_tooltip;
          } else {
            let posi_y =
              d3.select(this).attr("cy") -
              echelle_r(d["population_count"]) -
              hauteur_tooltip;
          }*/

          svg
            .select("#name_tooltip")
            .text(d["csd_name"])
            .attr("x", posi_x)
            .attr("y", posi_y);

          svg
            .select("#cwb_tooltip")
            .text(
              fields_labels[selected_field] +
                ": " +
                parseInt(d[indexes[selected_field]])
            )
            .attr("x", posi_x)
            .attr("y", posi_y + 2);

          svg
            .select("#rect_tooltip")
            .attr("width", largeur_tooltip)
            .attr("x", posi_x - largeur_tooltip / 2)
            .attr("y", posi_y - hauteur_tooltip / 2)
            .attr("opacity", 0.85);
        });

        // Tooltip mouseout
        svg.selectAll(".subdiv").on("mouseout", function() {
          svg
            .select("#name_tooltip")
            .text("")
            .attr("x", 0)
            .attr("y", 0);

          svg
            .select("#cwb_tooltip")
            .text("")
            .attr("x", 0)
            .attr("y", 0);

          svg
            .select("#rect_tooltip")
            .attr("width", 0)
            .attr("x", 0)
            .attr("y", 0)
            .attr("opacity", 0);
        });

        // Median lines
        let indigenous_data = data.filter(function(d) {
          return (
            d["province_name"] == province_code[selected_province] &&
            d["premieres_nations"]
          );
        });

        let median_indigenous = d3.median(indigenous_data, function(d) {
          return d[indexes[selected_field]];
        });

        if ("#median_line_indig" != null) {
          svg.select("#median_line_indig").remove();
        }
        svg
          .append("g")
          .attr("class", "median_line2")
          .attr("id", "median_line_indig")
          .append("line")
          .attr("stroke", "transparent")
          .attr("x1", margin.left - 11)
          .attr("y1", echelle_y(median_indigenous))
          .attr("x2", width / 2)
          .attr("y2", echelle_y(median_indigenous))
          .transition()
          .duration(2000)
          .delay(function(d, i) {
            return i;
          })
          .attr("stroke-width", 0.2)
          .attr("stroke", dark_grey)
          .style("stroke-dasharray", "3, 3")
          .style("opacity", 0.7);

        if ("#median_text_indig" != null) {
          svg.select("#median_text_indig").remove();
        }
        svg
          .append("g")
          .attr("class", "median_text2")
          .attr("id", "median_text_indig")
          .append("text")
          .attr("x", margin.left - 14)
          .attr("y", echelle_y(median_indigenous))
          .style("fill", background_color)
          .transition()
          .duration(2000)
          .delay(function(d, i) {
            return i;
          })
          .attr("text-anchor", "end")
          .attr("alignment-baseline", "middle")
          .text("median")
          .style("fill", dark_grey);

        let nonindigenous_data = data.filter(function(d) {
          return (
            d["province_name"] == province_code[selected_province] &&
            d["premieres_nations"] == false
          );
        });

        let median_nonindigenous = d3.median(nonindigenous_data, function(d) {
          return d[indexes[selected_field]];
        });

        if ("#median_line_nonindig" != null) {
          svg.select("#median_line_nonindig").remove();
        }
        svg
          .append("g")
          .attr("class", "median_line2")
          .attr("id", "median_line_nonindig")
          .append("line")
          .attr("stroke", "transparent")
          .attr("x1", width / 2)
          .attr("y1", echelle_y(median_nonindigenous))
          .attr("x2", width - margin.right + 13)
          .attr("y2", echelle_y(median_nonindigenous))
          .transition()
          .duration(2000)
          .delay(function(d, i) {
            return i;
          })
          .attr("stroke-width", 0.2)
          .attr("stroke", dark_grey)
          .style("stroke-dasharray", "3, 3")
          .style("opacity", 0.7);

        if ("#median_text_nonindig" != null) {
          svg.select("#median_text_nonindig").remove();
        }
        svg
          .append("g")
          .attr("class", "median_text2")
          .attr("id", "median_text_nonindig")
          .append("text")
          .attr("x", width - margin.right + 16)
          .attr("y", echelle_y(median_nonindigenous))
          .style("fill", background_color)
          .transition()
          .duration(2000)
          .delay(function(d, i) {
            return i;
          })
          .attr("text-anchor", "start")
          .attr("alignment-baseline", "middle")
          .style("fill", dark_grey)
          .text("median");
      }
    }
  });
}

// -------- SIXIEME FONCTION -------- //

function reset_svg3() {
  $("#canada_parent").show();
  $("#canada_parent2").show();
  $("#indicators").show();
  $("#content_dataviz3").show();
  $("#dataviz_wrapper3").show();
}

// -------- SEPTIÈME FONCTION -------- //

function canada() {
  let data = [
    {
      provinces: "British Columbia",
      non_indig: 53.51,
      indig: 39.93,
      total: 52.5
    },
    {
      provinces: "Alberta",
      non_indig: 53.95,
      indig: 30.27,
      total: 53.36
    },
    {
      provinces: "Saskatchewan",
      non_indig: 54.54,
      indig: 26.58,
      total: 53.75
    },
    {
      provinces: "Manitoba",
      non_indig: 51.98,
      indig: 25.44,
      total: 49.92
    },
    {
      provinces: "Ontario",
      non_indig: 52.67,
      indig: 36.78,
      total: 51.89
    },
    {
      provinces: "Quebec",
      non_indig: 50.69,
      indig: 38.29,
      total: 50.61
    },
    {
      provinces: "New Brunswick",
      non_indig: 49.84,
      indig: 39.42,
      total: 49.41
    },
    {
      provinces: "Nova Scotia",
      non_indig: 50.79,
      indig: 37.31,
      total: 50
    }
  ];

  // Dimensions
  let boundrect3 = document
    .querySelector("#dataviz_wrapper3")
    .getBoundingClientRect();

  let width = boundrect3.width - margin.left - margin.right,
    height = boundrect3.height - margin.top - margin.bottom,
    barPadding = 0.2,
    axisTicks = { qty: 5, outerSize: 0 };

  // Set scales
  var xScale0 = d3
    .scaleBand()
    .range([margin.right, width - margin.right])
    .padding(barPadding);
  var xScale1 = d3.scaleBand();
  var yScale = d3
    .scaleLinear()
    .range([height - margin.top - margin.bottom, margin.bottom]);

  // Set axis
  var xAxis = d3.axisBottom(xScale0).tickSizeOuter(axisTicks.outerSize);
  var yAxis = d3
    .axisLeft(yScale)
    .ticks(axisTicks.qty)
    .tickSizeOuter(axisTicks.outerSize);

  // Add domains
  xScale0.domain(data.map(d => d.provinces));
  xScale1.domain(["non_indig", "indig"]).range([0, xScale0.bandwidth()]);
  yScale.domain([
    0,
    d3.max(data, d => (d.non_indig > d.indig ? d.non_indig : d.indig))
  ]);

  let svg = d3
    .select("#dataviz3")
    .attr("width", width)
    .attr("height", height)
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  let value_format = d3.format(".2");
  /*
-----  OPACITÉ!  ------

Lorsque province sélectionnée (province_code[selected_province]), opacité = 1.
Sinon, opacité = 0.6.

  svg
    .selectAll(".provinces")
    .filter(function(d) {
      return (d.provinces = province_code[selected_province]);
    })
    .attr("opacity", function(d) {
      return 1;
    });
*/

  // Add non_indig bars
  svg
    .selectAll(".bar.non_indig")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar non_indig")
    .style("fill", green_color)
    .attr("stroke", green_color)
    .attr("stroke-width", 1)
    .attr("x", d => xScale0(d.provinces))
    .attr("y", d => yScale(d.non_indig))
    .attr("width", xScale1.bandwidth())
    .attr("height", d => {
      return height - margin.top - margin.bottom - yScale(d.non_indig);
    })
    .style("opacity", 0.5);

  // Non-indig text
  svg
    .selectAll("text_non_indig")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "text_non_indig")
    .attr("text-anchor", "middle")
    .attr("x", d => {
      return xScale0(d.provinces) + xScale1.bandwidth() / 2;
    })
    .attr("y", function(d) {
      return yScale(d.non_indig) + 12;
    })
    .text(function(d) {
      return value_format(d.non_indig);
    });

  // Add indig bars
  svg
    .selectAll(".bar.indig")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar indig")
    .style("fill", orange_color)
    .attr("stroke", orange_color)
    .attr("stroke-width", 1)
    .attr("x", d => xScale0(d.provinces) + xScale1.bandwidth())
    .attr("y", d => yScale(d.indig))
    .attr("width", xScale1.bandwidth())
    .attr("height", d => {
      return height - margin.top - margin.bottom - yScale(d.indig);
    })
    .style("opacity", 0.5);

  // Indig text
  svg
    .selectAll("text_indig")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "text_indig")
    .attr("text-anchor", "middle")
    .attr("x", d => {
      return xScale0(d.provinces) + xScale1.bandwidth() * 1.5;
    })
    .attr("y", function(d) {
      return yScale(d.indig) + 12;
    })
    .text(function(d) {
      return value_format(d.indig);
    });

  // Add the X Axis
  svg
    .append("g")
    .attr("class", "x_axis")
    .attr(
      "transform",
      "translate(0," + (height - margin.top - margin.bottom) + ")"
    )
    .call(xAxis);

  // Add the Y Axis
  svg
    .append("g")
    .attr("class", "y_axis")
    .attr("y", margin.left)
    .attr("x", margin.bottom)
    .attr("transform", "translate(" + margin.left + ",0" + ")")
    .call(yAxis);
}
