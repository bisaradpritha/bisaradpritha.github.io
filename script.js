new FinisherHeader({

    count:100,

    size:{
        min:2,
        max:13,
        pulse:0
    },

    speed:{
        x:{
            min:0,
            max:0.4
        },
        y:{
            min:0,
            max:0.6
        }
    },

    colors:{
        background:"#0d0320",
        particles:[
            "#bb5579",
            "#ae1249"
        ]
    },

    blending:"overlay",

    opacity:{
        center:1,
        edge:0
    },

    skew:-2,

    shapes:["c"]

});

