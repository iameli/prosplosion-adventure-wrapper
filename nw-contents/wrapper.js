(function() {
    var init = function(game) {
        new PAE.Game(game, {container: "GameContainer", resourceURL: "resources"})
    }
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState == 4) {
            init(req.responseText);
        }
    }
    req.open("GET", "game.json", true);
    req.send(null);
})()