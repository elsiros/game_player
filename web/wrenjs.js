var Module = typeof Module !== "undefined" ? Module : {};
if (!Module.expectedDataFileDownloads) {
    Module.expectedDataFileDownloads = 0
}
Module.expectedDataFileDownloads++;
(function() {
    var loadPackage = function(metadata) {
        var PACKAGE_PATH;
        if (typeof window === "object") {
            PACKAGE_PATH = window["encodeURIComponent"](window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf("/")) + "/")
        } else if (typeof location !== "undefined") {
            PACKAGE_PATH = encodeURIComponent(location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf("/")) + "/")
        } else {
            throw "using preloaded data can only be done on a web page or in a web worker"
        }
        var PACKAGE_NAME = "../web/wrenjs.data" ;
        var REMOTE_PACKAGE_BASE = "wrenjs.data";
        if (typeof Module["locateFilePackage"] === "function" && !Module["locateFile"]) {
            Module["locateFile"] = Module["locateFilePackage"];
            err("warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile (using your locateFilePackage for now)")
        }
        var REMOTE_PACKAGE_NAME = Module["locateFile"] ? Module["locateFile"](REMOTE_PACKAGE_BASE, "") : REMOTE_PACKAGE_BASE;
        var REMOTE_PACKAGE_SIZE = metadata["remote_package_size"];
        var PACKAGE_UUID = metadata["package_uuid"];
        function fetchRemotePackage(packageName, packageSize, callback, errback) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", packageName, true);
            xhr.responseType = "arraybuffer";
            xhr.onprogress = function(event) {
                var url = packageName;
                var size = packageSize;
                if (event.total)
                    size = event.total;
                if (event.loaded) {
                    if (!xhr.addedTotal) {
                        xhr.addedTotal = true;
                        if (!Module.dataFileDownloads)
                            Module.dataFileDownloads = {};
                        Module.dataFileDownloads[url] = {
                            loaded: event.loaded,
                            total: size
                        }
                    } else {
                        Module.dataFileDownloads[url].loaded = event.loaded
                    }
                    var total = 0;
                    var loaded = 0;
                    var num = 0;
                    for (var download in Module.dataFileDownloads) {
                        var data = Module.dataFileDownloads[download];
                        total += data.total;
                        loaded += data.loaded;
                        num++
                    }
                    total = Math.ceil(total * Module.expectedDataFileDownloads / num);
                    if (Module["setStatus"])
                        Module["setStatus"]("Downloading data... (" + loaded + "/" + total + ")")
                } else if (!Module.dataFileDownloads) {
                    if (Module["setStatus"])
                        Module["setStatus"]("Downloading data...")
                }
            }
            ;
            xhr.onerror = function(event) {
                throw new Error("NetworkError for: " + packageName)
            }
            ;
            xhr.onload = function(event) {
                if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || xhr.status == 0 && xhr.response) {
                    var packageData = xhr.response;
                    callback(packageData)
                } else {
                    throw new Error(xhr.statusText + " : " + xhr.responseURL)
                }
            }
            ;
            xhr.send(null)
        }
        function handleError(error) {
            console.error("package error:", error)
        }
        var fetchedCallback = null;
        var fetched = Module["getPreloadedPackage"] ? Module["getPreloadedPackage"](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE) : null;
        if (!fetched)
            fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, function(data) {
                if (fetchedCallback) {
                    fetchedCallback(data);
                    fetchedCallback = null
                } else {
                    fetched = data
                }
            }, handleError);
        function runWithFS() {
            function assert(check, msg) {
                if (!check)
                    throw msg + (new Error).stack
            }
            Module["FS_createPath"]("/", "resources", true, true);
            Module["FS_createPath"]("resources", "wren", true, true);
            Module["FS_createPath"]("resources/wren", "shaders", true, true);
            function DataRequest(start, end, audio) {
                this.start = start;
                this.end = end;
                this.audio = audio
            }
            DataRequest.prototype = {
                requests: {},
                open: function(mode, name) {
                    this.name = name;
                    this.requests[name] = this;
                    Module["addRunDependency"]("fp " + this.name)
                },
                send: function() {},
                onload: function() {
                    var byteArray = this.byteArray.subarray(this.start, this.end);
                    this.finish(byteArray)
                },
                finish: function(byteArray) {
                    var that = this;
                    Module["FS_createDataFile"](this.name, null, byteArray, true, true, true);
                    Module["removeRunDependency"]("fp " + that.name);
                    this.requests[this.name] = null
                }
            };
            var files = metadata["files"];
            for (var i = 0; i < files.length; ++i) {
                new DataRequest(files[i]["start"],files[i]["end"],files[i]["audio"]).open("GET", files[i]["filename"])
            }
            function processPackageData(arrayBuffer) {
                assert(arrayBuffer, "Loading data file failed.");
                assert(arrayBuffer instanceof ArrayBuffer, "bad input to processPackageData");
                var byteArray = new Uint8Array(arrayBuffer);
                DataRequest.prototype.byteArray = byteArray;
                var files = metadata["files"];
                for (var i = 0; i < files.length; ++i) {
                    DataRequest.prototype.requests[files[i].filename].onload()
                }
                Module["removeRunDependency"]("datafile_/../web/wrenjs.data")
            }
            Module["addRunDependency"]("datafile_/../web/wrenjs.data");
            if (!Module.preloadResults)
                Module.preloadResults = {};
            Module.preloadResults[PACKAGE_NAME] = {
                fromCache: false
            };
            if (fetched) {
                processPackageData(fetched);
                fetched = null
            } else {
                fetchedCallback = processPackageData
            }
        }
        if (Module["calledRun"]) {
            runWithFS()
        } else {
            if (!Module["preRun"])
                Module["preRun"] = [];
            Module["preRun"].push(runWithFS)
        }
    };
    loadPackage({
        "files": [{
            "filename": "../resources/wren/shaders/noise_mask.frag",
            "start": 0,
            "end": 572,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/depth_only.frag",
            "start": 572,
            "end": 706,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/default.vert",
            "start": 706,
            "end": 1731,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/pbr_stencil_ambient_emissive.vert",
            "start": 1731,
            "end": 2863,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/gaussian_blur.frag",
            "start": 2863,
            "end": 4565,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/color_noise.frag",
            "start": 4565,
            "end": 5927,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/blend_bloom.frag",
            "start": 5927,
            "end": 6670,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/encode_depth.frag",
            "start": 6670,
            "end": 7105,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/point_set.vert",
            "start": 7105,
            "end": 7683,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/smaa_final_blend.vert",
            "start": 7683,
            "end": 8328,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/smaa_blending_weights.vert",
            "start": 8328,
            "end": 9277,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/gaussian_blur_9_tap.frag",
            "start": 9277,
            "end": 12109,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/lens_flare.vert",
            "start": 12109,
            "end": 12323,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/handles.vert",
            "start": 12323,
            "end": 13831,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/range_noise.vert",
            "start": 13831,
            "end": 14644,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/bake_specular_cubemap.frag",
            "start": 14644,
            "end": 18280,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/phong_stencil_ambient_emissive.frag",
            "start": 18280,
            "end": 20937,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/gtao.frag",
            "start": 20937,
            "end": 27389,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/shadow_volume.frag",
            "start": 27389,
            "end": 27613,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/bounding_volume.frag",
            "start": 27613,
            "end": 27733,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/gaussian_blur_5_tap.frag",
            "start": 27733,
            "end": 30408,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/gaussian_blur_13_tap.frag",
            "start": 30408,
            "end": 33688,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/simple.vert",
            "start": 33688,
            "end": 34294,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/handles.frag",
            "start": 34294,
            "end": 35917,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/smaa_edge_detect.frag",
            "start": 35917,
            "end": 37717,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/coordinate_system.vert",
            "start": 37717,
            "end": 38608,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/phong.frag",
            "start": 38608,
            "end": 46873,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/picking.vert",
            "start": 46873,
            "end": 47240,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/smaa_edge_detect.vert",
            "start": 47240,
            "end": 47896,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/phong_stencil_diffuse_specular.vert",
            "start": 47896,
            "end": 48936,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/segmentation.vert",
            "start": 48936,
            "end": 49303,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/color_noise.vert",
            "start": 49303,
            "end": 50336,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/shadow_volume.vert",
            "start": 50336,
            "end": 52647,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/hdr_clear.frag",
            "start": 52647,
            "end": 53093,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/line_set.vert",
            "start": 53093,
            "end": 53617,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/bright_pass.frag",
            "start": 53617,
            "end": 54963,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/fog.frag",
            "start": 54963,
            "end": 56024,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/coordinate_system.frag",
            "start": 56024,
            "end": 56625,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/bake_diffuse_cubemap.frag",
            "start": 56625,
            "end": 58002,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/web_depth.frag",
            "start": 58002,
            "end": 58268,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/point_set.frag",
            "start": 58268,
            "end": 59162,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/gtao_combine.frag",
            "start": 59162,
            "end": 60222,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/smaa_final_blend.frag",
            "start": 60222,
            "end": 62091,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/skybox.vert",
            "start": 62091,
            "end": 62465,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/gtao_temporal_denoise.frag",
            "start": 62465,
            "end": 65125,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/segmentation.frag",
            "start": 65125,
            "end": 65480,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/range_noise.frag",
            "start": 65480,
            "end": 66898,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/phong_stencil_diffuse_specular.frag",
            "start": 66898,
            "end": 73978,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/pbr_stencil_diffuse_specular.vert",
            "start": 73978,
            "end": 75118,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/merge_spherical.frag",
            "start": 75118,
            "end": 78983,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/default.frag",
            "start": 78983,
            "end": 80372,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/motion_blur.frag",
            "start": 80372,
            "end": 80938,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/line_set.frag",
            "start": 80938,
            "end": 81474,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/bake_brdf.vert",
            "start": 81474,
            "end": 81657,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/overlay.frag",
            "start": 81657,
            "end": 85827,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/simple.frag",
            "start": 85827,
            "end": 86637,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/depth_only.vert",
            "start": 86637,
            "end": 87163,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/blend_lens_flare.frag",
            "start": 87163,
            "end": 87505,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/web_depth.vert",
            "start": 87505,
            "end": 88070,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/skybox.frag",
            "start": 88070,
            "end": 88536,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/pbr.vert",
            "start": 88536,
            "end": 89542,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/merge_spherical.fragA",
            "start": 89542,
            "end": 93845,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/depth_of_field.frag",
            "start": 93845,
            "end": 97334,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/lens_distortion.frag",
            "start": 97334,
            "end": 98938,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/bake_cubemap.vert",
            "start": 98938,
            "end": 99164,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/pass_through.vert",
            "start": 99164,
            "end": 99378,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/pbr_stencil_diffuse_specular.frag",
            "start": 99378,
            "end": 112300,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/hdr_resolve.frag",
            "start": 112300,
            "end": 112738,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/light_representation.vert",
            "start": 112738,
            "end": 113786,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/smaa_blending_weights.frag",
            "start": 113786,
            "end": 130013,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/encode_depth.vert",
            "start": 130013,
            "end": 130458,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/pbr.frag",
            "start": 130458,
            "end": 146442,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/bounding_volume.vert",
            "start": 146442,
            "end": 146817,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/bake_brdf.frag",
            "start": 146817,
            "end": 149875,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/phong.vert",
            "start": 149875,
            "end": 150788,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/lens_flare.frag",
            "start": 150788,
            "end": 152626,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/phong_stencil_ambient_emissive.vert",
            "start": 152626,
            "end": 153598,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/gtao_spatial_denoise.frag",
            "start": 153598,
            "end": 157319,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/light_representation.frag",
            "start": 157319,
            "end": 157548,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/fog.vert",
            "start": 157548,
            "end": 158201,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/depth_resolution.frag",
            "start": 158201,
            "end": 158567,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/overlay.vert",
            "start": 158567,
            "end": 161335,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/pass_through.frag",
            "start": 161335,
            "end": 161628,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/picking.frag",
            "start": 161628,
            "end": 162054,
            "audio": 0
        }, {
            "filename": "../resources/wren/shaders/pbr_stencil_ambient_emissive.frag",
            "start": 162054,
            "end": 169063,
            "audio": 0
        }],
        "remote_package_size": 169063,
        "package_uuid": "1ae89bb4-8171-4c80-a05c-ca629008dc54"
    })
}
)();
var moduleOverrides = {};
var key;
for (key in Module) {
    if (Module.hasOwnProperty(key)) {
        moduleOverrides[key] = Module[key]
    }
}
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = function(status, toThrow) {
    throw toThrow
};
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === "object";
ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
ENVIRONMENT_IS_NODE = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string";
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
var scriptDirectory = "";
function locateFile(path) {
    if (Module["locateFile"]) {
        return Module["locateFile"](path, scriptDirectory)
    }
    return scriptDirectory + path
}
var read_, readAsync, readBinary, setWindowTitle;
var nodeFS;
var nodePath;
if (ENVIRONMENT_IS_NODE) {
    if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = require("path").dirname(scriptDirectory) + "/"
    } else {
        scriptDirectory = __dirname + "/"
    }
    read_ = function shell_read(filename, binary) {
        if (!nodeFS)
            nodeFS = require("fs");
        if (!nodePath)
            nodePath = require("path");
        filename = nodePath["normalize"](filename);
        return nodeFS["readFileSync"](filename, binary ? null : "utf8")
    }
    ;
    readBinary = function readBinary(filename) {
        var ret = read_(filename, true);
        if (!ret.buffer) {
            ret = new Uint8Array(ret)
        }
        assert(ret.buffer);
        return ret
    }
    ;
    if (process["argv"].length > 1) {
        thisProgram = process["argv"][1].replace(/\\/g, "/")
    }
    arguments_ = process["argv"].slice(2);
    if (typeof module !== "undefined") {
        module["exports"] = Module
    }
    process["on"]("uncaughtException", function(ex) {
        if (!(ex instanceof ExitStatus)) {
            throw ex
        }
    });
    process["on"]("unhandledRejection", abort);
    quit_ = function(status) {
        process["exit"](status)
    }
    ;
    Module["inspect"] = function() {
        return "[Emscripten Module object]"
    }
} else if (ENVIRONMENT_IS_SHELL) {
    if (typeof read != "undefined") {
        read_ = function shell_read(f) {
            return read(f)
        }
    }
    readBinary = function readBinary(f) {
        var data;
        if (typeof readbuffer === "function") {
            return new Uint8Array(readbuffer(f))
        }
        data = read(f, "binary");
        assert(typeof data === "object");
        return data
    }
    ;
    if (typeof scriptArgs != "undefined") {
        arguments_ = scriptArgs
    } else if (typeof arguments != "undefined") {
        arguments_ = arguments
    }
    if (typeof quit === "function") {
        quit_ = function(status) {
            quit(status)
        }
    }
    if (typeof print !== "undefined") {
        if (typeof console === "undefined")
            console = {};
        console.log = print;
        console.warn = console.error = typeof printErr !== "undefined" ? printErr : print
    }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href
    } else if (typeof document !== "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src
    }
    if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1)
    } else {
        scriptDirectory = ""
    }
    {
        read_ = function(url) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, false);
            xhr.send(null);
            return xhr.responseText
        }
        ;
        if (ENVIRONMENT_IS_WORKER) {
            readBinary = function(url) {
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                xhr.responseType = "arraybuffer";
                xhr.send(null);
                return new Uint8Array(xhr.response)
            }
        }
        readAsync = function(url, onload, onerror) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function() {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    onload(xhr.response);
                    return
                }
                onerror()
            }
            ;
            xhr.onerror = onerror;
            xhr.send(null)
        }
    }
    setWindowTitle = function(title) {
        document.title = title
    }
} else {}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.warn.bind(console);
for (key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
        Module[key] = moduleOverrides[key]
    }
}
moduleOverrides = null;
if (Module["arguments"])
    arguments_ = Module["arguments"];
if (Module["thisProgram"])
    thisProgram = Module["thisProgram"];
if (Module["quit"])
    quit_ = Module["quit"];
var STACK_ALIGN = 16;
function alignMemory(size, factor) {
    if (!factor)
        factor = STACK_ALIGN;
    return Math.ceil(size / factor) * factor
}
var wasmBinary;
if (Module["wasmBinary"])
    wasmBinary = Module["wasmBinary"];
var noExitRuntime = Module["noExitRuntime"] || false;
if (typeof WebAssembly !== "object") {
    abort("no native wasm support detected")
}
function getValue(ptr, type, noSafe) {
    type = type || "i8";
    if (type.charAt(type.length - 1) === "*")
        type = "i32";
    switch (type) {
    case "i1":
        return HEAP8[ptr >> 0];
    case "i8":
        return HEAP8[ptr >> 0];
    case "i16":
        return HEAP16[ptr >> 1];
    case "i32":
        return HEAP32[ptr >> 2];
    case "i64":
        return HEAP32[ptr >> 2];
    case "float":
        return HEAPF32[ptr >> 2];
    case "double":
        return HEAPF64[ptr >> 3];
    default:
        abort("invalid type for getValue: " + type)
    }
    return null
}
var wasmMemory;
var ABORT = false;
var EXITSTATUS;
function assert(condition, text) {
    if (!condition) {
        abort("Assertion failed: " + text)
    }
}
function getCFunc(ident) {
    var func = Module["_" + ident];
    assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
    return func
}
function ccall(ident, returnType, argTypes, args, opts) {
    var toC = {
        "string": function(str) {
            var ret = 0;
            if (str !== null && str !== undefined && str !== 0) {
                var len = (str.length << 2) + 1;
                ret = stackAlloc(len);
                stringToUTF8(str, ret, len)
            }
            return ret
        },
        "array": function(arr) {
            var ret = stackAlloc(arr.length);
            writeArrayToMemory(arr, ret);
            return ret
        }
    };
    function convertReturnValue(ret) {
        if (returnType === "string")
            return UTF8ToString(ret);
        if (returnType === "boolean")
            return Boolean(ret);
        return ret
    }
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
        for (var i = 0; i < args.length; i++) {
            var converter = toC[argTypes[i]];
            if (converter) {
                if (stack === 0)
                    stack = stackSave();
                cArgs[i] = converter(args[i])
            } else {
                cArgs[i] = args[i]
            }
        }
    }
    var ret = func.apply(null, cArgs);
    ret = convertReturnValue(ret);
    if (stack !== 0)
        stackRestore(stack);
    return ret
}
var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;
function UTF8ArrayToString(heap, idx, maxBytesToRead) {
    var endIdx = idx + maxBytesToRead;
    var endPtr = idx;
    while (heap[endPtr] && !(endPtr >= endIdx))
        ++endPtr;
    if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
        return UTF8Decoder.decode(heap.subarray(idx, endPtr))
    } else {
        var str = "";
        while (idx < endPtr) {
            var u0 = heap[idx++];
            if (!(u0 & 128)) {
                str += String.fromCharCode(u0);
                continue
            }
            var u1 = heap[idx++] & 63;
            if ((u0 & 224) == 192) {
                str += String.fromCharCode((u0 & 31) << 6 | u1);
                continue
            }
            var u2 = heap[idx++] & 63;
            if ((u0 & 240) == 224) {
                u0 = (u0 & 15) << 12 | u1 << 6 | u2
            } else {
                u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heap[idx++] & 63
            }
            if (u0 < 65536) {
                str += String.fromCharCode(u0)
            } else {
                var ch = u0 - 65536;
                str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
            }
        }
    }
    return str
}
function UTF8ToString(ptr, maxBytesToRead) {
    return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ""
}
function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0))
        return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
            var u1 = str.charCodeAt(++i);
            u = 65536 + ((u & 1023) << 10) | u1 & 1023
        }
        if (u <= 127) {
            if (outIdx >= endIdx)
                break;
            heap[outIdx++] = u
        } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx)
                break;
            heap[outIdx++] = 192 | u >> 6;
            heap[outIdx++] = 128 | u & 63
        } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx)
                break;
            heap[outIdx++] = 224 | u >> 12;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63
        } else {
            if (outIdx + 3 >= endIdx)
                break;
            heap[outIdx++] = 240 | u >> 18;
            heap[outIdx++] = 128 | u >> 12 & 63;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63
        }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx
}
function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}
function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343)
            u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
        if (u <= 127)
            ++len;
        else if (u <= 2047)
            len += 2;
        else if (u <= 65535)
            len += 3;
        else
            len += 4
    }
    return len
}
function writeArrayToMemory(array, buffer) {
    HEAP8.set(array, buffer)
}
function writeAsciiToMemory(str, buffer, dontAddNull) {
    for (var i = 0; i < str.length; ++i) {
        HEAP8[buffer++ >> 0] = str.charCodeAt(i)
    }
    if (!dontAddNull)
        HEAP8[buffer >> 0] = 0
}
function alignUp(x, multiple) {
    if (x % multiple > 0) {
        x += multiple - x % multiple
    }
    return x
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
function updateGlobalBufferAndViews(buf) {
    buffer = buf;
    Module["HEAP8"] = HEAP8 = new Int8Array(buf);
    Module["HEAP16"] = HEAP16 = new Int16Array(buf);
    Module["HEAP32"] = HEAP32 = new Int32Array(buf);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(buf)
}
var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 16777216;
var wasmTable;
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
    if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function")
            Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
            addOnPreRun(Module["preRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPRERUN__)
}
function initRuntime() {
    runtimeInitialized = true;
    if (!Module["noFSInit"] && !FS.init.initialized)
        FS.init();
    TTY.init();
    callRuntimeCallbacks(__ATINIT__)
}
function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
    FS.quit();
    TTY.shutdown();
    runtimeExited = true
}
function postRun() {
    if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function")
            Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
            addOnPostRun(Module["postRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPOSTRUN__)
}
function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb)
}
function addOnInit(cb) {
    __ATINIT__.unshift(cb)
}
function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb)
}
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function getUniqueRunDependency(id) {
    return id
}
function addRunDependency(id) {
    runDependencies++;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
}
function removeRunDependency(id) {
    runDependencies--;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
    if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null
        }
        if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback()
        }
    }
}
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
function abort(what) {
    if (Module["onAbort"]) {
        Module["onAbort"](what)
    }
    what += "";
    err(what);
    ABORT = true;
    EXITSTATUS = 1;
    what = "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
    var e = new WebAssembly.RuntimeError(what);
    throw e
}
var dataURIPrefix = "data:application/octet-stream;base64,";
function isDataURI(filename) {
    return filename.startsWith(dataURIPrefix)
}
function isFileURI(filename) {
    return filename.startsWith("file://")
}
var wasmBinaryFile = "wrenjs.wasm";
if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile)
}
function getBinary(file) {
    try {
        if (file == wasmBinaryFile && wasmBinary) {
            return new Uint8Array(wasmBinary)
        }
        if (readBinary) {
            return readBinary(file)
        } else {
            throw "both async and sync fetching of the wasm failed"
        }
    } catch (err) {
        abort(err)
    }
}
function getBinaryPromise() {
    if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch === "function" && !isFileURI(wasmBinaryFile)) {
            return fetch(wasmBinaryFile, {
                credentials: "same-origin"
            }).then(function(response) {
                if (!response["ok"]) {
                    throw "failed to load wasm binary file at '" + wasmBinaryFile + "'"
                }
                return response["arrayBuffer"]()
            }).catch(function() {
                return getBinary(wasmBinaryFile)
            })
        } else {
            if (readAsync) {
                return new Promise(function(resolve, reject) {
                    readAsync(wasmBinaryFile, function(response) {
                        resolve(new Uint8Array(response))
                    }, reject)
                }
                )
            }
        }
    }
    return Promise.resolve().then(function() {
        return getBinary(wasmBinaryFile)
    })
}
function createWasm() {
    var info = {
        "a": asmLibraryArg
    };
    function receiveInstance(instance, module) {
        var exports = instance.exports;
        Module["asm"] = exports;
        wasmMemory = Module["asm"]["Za"];
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module["asm"]["$a"];
        addOnInit(Module["asm"]["_a"]);
        removeRunDependency("wasm-instantiate")
    }
    addRunDependency("wasm-instantiate");
    function receiveInstantiationResult(result) {
        receiveInstance(result["instance"])
    }
    function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function(binary) {
            var result = WebAssembly.instantiate(binary, info);
            return result
        }).then(receiver, function(reason) {
            err("failed to asynchronously prepare wasm: " + reason);
            abort(reason)
        })
    }
    function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) && typeof fetch === "function") {
            return fetch(wasmBinaryFile, {
                credentials: "same-origin"
            }).then(function(response) {
                var result = WebAssembly.instantiateStreaming(response, info);
                return result.then(receiveInstantiationResult, function(reason) {
                    err("wasm streaming compile failed: " + reason);
                    err("falling back to ArrayBuffer instantiation");
                    return instantiateArrayBuffer(receiveInstantiationResult)
                })
            })
        } else {
            return instantiateArrayBuffer(receiveInstantiationResult)
        }
    }
    if (Module["instantiateWasm"]) {
        try {
            var exports = Module["instantiateWasm"](info, receiveInstance);
            return exports
        } catch (e) {
            err("Module.instantiateWasm callback failed with error: " + e);
            return false
        }
    }
    instantiateAsync();
    return {}
}
var tempDouble;
var tempI64;
var ASM_CONSTS = {
    31668: function($0, $1, $2) {
        Module.ctx.getBufferSubData(Module.ctx.PIXEL_PACK_BUFFER, $2, HEAPU8.subarray($0, $0 + $1))
    }
};
function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
        var callback = callbacks.shift();
        if (typeof callback == "function") {
            callback(Module);
            continue
        }
        var func = callback.func;
        if (typeof func === "number") {
            if (callback.arg === undefined) {
                wasmTable.get(func)()
            } else {
                wasmTable.get(func)(callback.arg)
            }
        } else {
            func(callback.arg === undefined ? null : callback.arg)
        }
    }
}
var runtimeKeepaliveCounter = 0;
function keepRuntimeAlive() {
    return noExitRuntime || runtimeKeepaliveCounter > 0
}
var ExceptionInfoAttrs = {
    DESTRUCTOR_OFFSET: 0,
    REFCOUNT_OFFSET: 4,
    TYPE_OFFSET: 8,
    CAUGHT_OFFSET: 12,
    RETHROWN_OFFSET: 13,
    SIZE: 16
};
function ___cxa_allocate_exception(size) {
    return _malloc(size + ExceptionInfoAttrs.SIZE) + ExceptionInfoAttrs.SIZE
}
function _atexit(func, arg) {
    __ATEXIT__.unshift({
        func: func,
        arg: arg
    })
}
function ___cxa_atexit(a0, a1) {
    return _atexit(a0, a1)
}
function ExceptionInfo(excPtr) {
    this.excPtr = excPtr;
    this.ptr = excPtr - ExceptionInfoAttrs.SIZE;
    this.set_type = function(type) {
        HEAP32[this.ptr + ExceptionInfoAttrs.TYPE_OFFSET >> 2] = type
    }
    ;
    this.get_type = function() {
        return HEAP32[this.ptr + ExceptionInfoAttrs.TYPE_OFFSET >> 2]
    }
    ;
    this.set_destructor = function(destructor) {
        HEAP32[this.ptr + ExceptionInfoAttrs.DESTRUCTOR_OFFSET >> 2] = destructor
    }
    ;
    this.get_destructor = function() {
        return HEAP32[this.ptr + ExceptionInfoAttrs.DESTRUCTOR_OFFSET >> 2]
    }
    ;
    this.set_refcount = function(refcount) {
        HEAP32[this.ptr + ExceptionInfoAttrs.REFCOUNT_OFFSET >> 2] = refcount
    }
    ;
    this.set_caught = function(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + ExceptionInfoAttrs.CAUGHT_OFFSET >> 0] = caught
    }
    ;
    this.get_caught = function() {
        return HEAP8[this.ptr + ExceptionInfoAttrs.CAUGHT_OFFSET >> 0] != 0
    }
    ;
    this.set_rethrown = function(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + ExceptionInfoAttrs.RETHROWN_OFFSET >> 0] = rethrown
    }
    ;
    this.get_rethrown = function() {
        return HEAP8[this.ptr + ExceptionInfoAttrs.RETHROWN_OFFSET >> 0] != 0
    }
    ;
    this.init = function(type, destructor) {
        this.set_type(type);
        this.set_destructor(destructor);
        this.set_refcount(0);
        this.set_caught(false);
        this.set_rethrown(false)
    }
    ;
    this.add_ref = function() {
        var value = HEAP32[this.ptr + ExceptionInfoAttrs.REFCOUNT_OFFSET >> 2];
        HEAP32[this.ptr + ExceptionInfoAttrs.REFCOUNT_OFFSET >> 2] = value + 1
    }
    ;
    this.release_ref = function() {
        var prev = HEAP32[this.ptr + ExceptionInfoAttrs.REFCOUNT_OFFSET >> 2];
        HEAP32[this.ptr + ExceptionInfoAttrs.REFCOUNT_OFFSET >> 2] = prev - 1;
        return prev === 1
    }
}
var exceptionLast = 0;
var uncaughtExceptionCount = 0;
function ___cxa_throw(ptr, type, destructor) {
    var info = new ExceptionInfo(ptr);
    info.init(type, destructor);
    exceptionLast = ptr;
    uncaughtExceptionCount++;
    throw ptr
}
function setErrNo(value) {
    HEAP32[___errno_location() >> 2] = value;
    return value
}
var PATH = {
    splitPath: function(filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1)
    },
    normalizeArray: function(parts, allowAboveRoot) {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === ".") {
                parts.splice(i, 1)
            } else if (last === "..") {
                parts.splice(i, 1);
                up++
            } else if (up) {
                parts.splice(i, 1);
                up--
            }
        }
        if (allowAboveRoot) {
            for (; up; up--) {
                parts.unshift("..")
            }
        }
        return parts
    },
    normalize: function(path) {
        var isAbsolute = path.charAt(0) === "/"
          , trailingSlash = path.substr(-1) === "/";
        path = PATH.normalizeArray(path.split("/").filter(function(p) {
            return !!p
        }), !isAbsolute).join("/");
        if (!path && !isAbsolute) {
            path = "."
        }
        if (path && trailingSlash) {
            path += "/"
        }
        return (isAbsolute ? "/" : "") + path
    },
    dirname: function(path) {
        var result = PATH.splitPath(path)
          , root = result[0]
          , dir = result[1];
        if (!root && !dir) {
            return "."
        }
        if (dir) {
            dir = dir.substr(0, dir.length - 1)
        }
        return root + dir
    },
    basename: function(path) {
        if (path === "/")
            return "/";
        path = PATH.normalize(path);
        path = path.replace(/\/$/, "");
        var lastSlash = path.lastIndexOf("/");
        if (lastSlash === -1)
            return path;
        return path.substr(lastSlash + 1)
    },
    extname: function(path) {
        return PATH.splitPath(path)[3]
    },
    join: function() {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join("/"))
    },
    join2: function(l, r) {
        return PATH.normalize(l + "/" + r)
    }
};
function getRandomDevice() {
    if (typeof crypto === "object" && typeof crypto["getRandomValues"] === "function") {
        var randomBuffer = new Uint8Array(1);
        return function() {
            crypto.getRandomValues(randomBuffer);
            return randomBuffer[0]
        }
    } else if (ENVIRONMENT_IS_NODE) {
        try {
            var crypto_module = require("crypto");
            return function() {
                return crypto_module["randomBytes"](1)[0]
            }
        } catch (e) {}
    }
    return function() {
        abort("randomDevice")
    }
}
var PATH_FS = {
    resolve: function() {
        var resolvedPath = ""
          , resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
            var path = i >= 0 ? arguments[i] : FS.cwd();
            if (typeof path !== "string") {
                throw new TypeError("Arguments to path.resolve must be strings")
            } else if (!path) {
                return ""
            }
            resolvedPath = path + "/" + resolvedPath;
            resolvedAbsolute = path.charAt(0) === "/"
        }
        resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function(p) {
            return !!p
        }), !resolvedAbsolute).join("/");
        return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
    },
    relative: function(from, to) {
        from = PATH_FS.resolve(from).substr(1);
        to = PATH_FS.resolve(to).substr(1);
        function trim(arr) {
            var start = 0;
            for (; start < arr.length; start++) {
                if (arr[start] !== "")
                    break
            }
            var end = arr.length - 1;
            for (; end >= 0; end--) {
                if (arr[end] !== "")
                    break
            }
            if (start > end)
                return [];
            return arr.slice(start, end - start + 1)
        }
        var fromParts = trim(from.split("/"));
        var toParts = trim(to.split("/"));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
            if (fromParts[i] !== toParts[i]) {
                samePartsLength = i;
                break
            }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
            outputParts.push("..")
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join("/")
    }
};
var TTY = {
    ttys: [],
    init: function() {},
    shutdown: function() {},
    register: function(dev, ops) {
        TTY.ttys[dev] = {
            input: [],
            output: [],
            ops: ops
        };
        FS.registerDevice(dev, TTY.stream_ops)
    },
    stream_ops: {
        open: function(stream) {
            var tty = TTY.ttys[stream.node.rdev];
            if (!tty) {
                throw new FS.ErrnoError(43)
            }
            stream.tty = tty;
            stream.seekable = false
        },
        close: function(stream) {
            stream.tty.ops.flush(stream.tty)
        },
        flush: function(stream) {
            stream.tty.ops.flush(stream.tty)
        },
        read: function(stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.get_char) {
                throw new FS.ErrnoError(60)
            }
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
                var result;
                try {
                    result = stream.tty.ops.get_char(stream.tty)
                } catch (e) {
                    throw new FS.ErrnoError(29)
                }
                if (result === undefined && bytesRead === 0) {
                    throw new FS.ErrnoError(6)
                }
                if (result === null || result === undefined)
                    break;
                bytesRead++;
                buffer[offset + i] = result
            }
            if (bytesRead) {
                stream.node.timestamp = Date.now()
            }
            return bytesRead
        },
        write: function(stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.put_char) {
                throw new FS.ErrnoError(60)
            }
            try {
                for (var i = 0; i < length; i++) {
                    stream.tty.ops.put_char(stream.tty, buffer[offset + i])
                }
            } catch (e) {
                throw new FS.ErrnoError(29)
            }
            if (length) {
                stream.node.timestamp = Date.now()
            }
            return i
        }
    },
    default_tty_ops: {
        get_char: function(tty) {
            if (!tty.input.length) {
                var result = null;
                if (ENVIRONMENT_IS_NODE) {
                    var BUFSIZE = 256;
                    var buf = Buffer.alloc ? Buffer.alloc(BUFSIZE) : new Buffer(BUFSIZE);
                    var bytesRead = 0;
                    try {
                        bytesRead = nodeFS.readSync(process.stdin.fd, buf, 0, BUFSIZE, null)
                    } catch (e) {
                        if (e.toString().includes("EOF"))
                            bytesRead = 0;
                        else
                            throw e
                    }
                    if (bytesRead > 0) {
                        result = buf.slice(0, bytesRead).toString("utf-8")
                    } else {
                        result = null
                    }
                } else if (typeof window != "undefined" && typeof window.prompt == "function") {
                    result = window.prompt("Input: ");
                    if (result !== null) {
                        result += "\n"
                    }
                } else if (typeof readline == "function") {
                    result = readline();
                    if (result !== null) {
                        result += "\n"
                    }
                }
                if (!result) {
                    return null
                }
                tty.input = intArrayFromString(result, true)
            }
            return tty.input.shift()
        },
        put_char: function(tty, val) {
            if (val === null || val === 10) {
                out(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0)
                    tty.output.push(val)
            }
        },
        flush: function(tty) {
            if (tty.output && tty.output.length > 0) {
                out(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        }
    },
    default_tty1_ops: {
        put_char: function(tty, val) {
            if (val === null || val === 10) {
                err(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0)
                    tty.output.push(val)
            }
        },
        flush: function(tty) {
            if (tty.output && tty.output.length > 0) {
                err(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        }
    }
};
function mmapAlloc(size) {
    var alignedSize = alignMemory(size, 16384);
    var ptr = _malloc(alignedSize);
    while (size < alignedSize)
        HEAP8[ptr + size++] = 0;
    return ptr
}
var MEMFS = {
    ops_table: null,
    mount: function(mount) {
        return MEMFS.createNode(null, "/", 16384 | 511, 0)
    },
    createNode: function(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
            throw new FS.ErrnoError(63)
        }
        if (!MEMFS.ops_table) {
            MEMFS.ops_table = {
                dir: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        lookup: MEMFS.node_ops.lookup,
                        mknod: MEMFS.node_ops.mknod,
                        rename: MEMFS.node_ops.rename,
                        unlink: MEMFS.node_ops.unlink,
                        rmdir: MEMFS.node_ops.rmdir,
                        readdir: MEMFS.node_ops.readdir,
                        symlink: MEMFS.node_ops.symlink
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek
                    }
                },
                file: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek,
                        read: MEMFS.stream_ops.read,
                        write: MEMFS.stream_ops.write,
                        allocate: MEMFS.stream_ops.allocate,
                        mmap: MEMFS.stream_ops.mmap,
                        msync: MEMFS.stream_ops.msync
                    }
                },
                link: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        readlink: MEMFS.node_ops.readlink
                    },
                    stream: {}
                },
                chrdev: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: FS.chrdev_stream_ops
                }
            }
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
            node.node_ops = MEMFS.ops_table.dir.node;
            node.stream_ops = MEMFS.ops_table.dir.stream;
            node.contents = {}
        } else if (FS.isFile(node.mode)) {
            node.node_ops = MEMFS.ops_table.file.node;
            node.stream_ops = MEMFS.ops_table.file.stream;
            node.usedBytes = 0;
            node.contents = null
        } else if (FS.isLink(node.mode)) {
            node.node_ops = MEMFS.ops_table.link.node;
            node.stream_ops = MEMFS.ops_table.link.stream
        } else if (FS.isChrdev(node.mode)) {
            node.node_ops = MEMFS.ops_table.chrdev.node;
            node.stream_ops = MEMFS.ops_table.chrdev.stream
        }
        node.timestamp = Date.now();
        if (parent) {
            parent.contents[name] = node;
            parent.timestamp = node.timestamp
        }
        return node
    },
    getFileDataAsTypedArray: function(node) {
        if (!node.contents)
            return new Uint8Array(0);
        if (node.contents.subarray)
            return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents)
    },
    expandFileStorage: function(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity)
            return;
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
        if (prevCapacity != 0)
            newCapacity = Math.max(newCapacity, 256);
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity);
        if (node.usedBytes > 0)
            node.contents.set(oldContents.subarray(0, node.usedBytes), 0)
    },
    resizeFileStorage: function(node, newSize) {
        if (node.usedBytes == newSize)
            return;
        if (newSize == 0) {
            node.contents = null;
            node.usedBytes = 0
        } else {
            var oldContents = node.contents;
            node.contents = new Uint8Array(newSize);
            if (oldContents) {
                node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
            }
            node.usedBytes = newSize
        }
    },
    node_ops: {
        getattr: function(node) {
            var attr = {};
            attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
            attr.ino = node.id;
            attr.mode = node.mode;
            attr.nlink = 1;
            attr.uid = 0;
            attr.gid = 0;
            attr.rdev = node.rdev;
            if (FS.isDir(node.mode)) {
                attr.size = 4096
            } else if (FS.isFile(node.mode)) {
                attr.size = node.usedBytes
            } else if (FS.isLink(node.mode)) {
                attr.size = node.link.length
            } else {
                attr.size = 0
            }
            attr.atime = new Date(node.timestamp);
            attr.mtime = new Date(node.timestamp);
            attr.ctime = new Date(node.timestamp);
            attr.blksize = 4096;
            attr.blocks = Math.ceil(attr.size / attr.blksize);
            return attr
        },
        setattr: function(node, attr) {
            if (attr.mode !== undefined) {
                node.mode = attr.mode
            }
            if (attr.timestamp !== undefined) {
                node.timestamp = attr.timestamp
            }
            if (attr.size !== undefined) {
                MEMFS.resizeFileStorage(node, attr.size)
            }
        },
        lookup: function(parent, name) {
            throw FS.genericErrors[44]
        },
        mknod: function(parent, name, mode, dev) {
            return MEMFS.createNode(parent, name, mode, dev)
        },
        rename: function(old_node, new_dir, new_name) {
            if (FS.isDir(old_node.mode)) {
                var new_node;
                try {
                    new_node = FS.lookupNode(new_dir, new_name)
                } catch (e) {}
                if (new_node) {
                    for (var i in new_node.contents) {
                        throw new FS.ErrnoError(55)
                    }
                }
            }
            delete old_node.parent.contents[old_node.name];
            old_node.parent.timestamp = Date.now();
            old_node.name = new_name;
            new_dir.contents[new_name] = old_node;
            new_dir.timestamp = old_node.parent.timestamp;
            old_node.parent = new_dir
        },
        unlink: function(parent, name) {
            delete parent.contents[name];
            parent.timestamp = Date.now()
        },
        rmdir: function(parent, name) {
            var node = FS.lookupNode(parent, name);
            for (var i in node.contents) {
                throw new FS.ErrnoError(55)
            }
            delete parent.contents[name];
            parent.timestamp = Date.now()
        },
        readdir: function(node) {
            var entries = [".", ".."];
            for (var key in node.contents) {
                if (!node.contents.hasOwnProperty(key)) {
                    continue
                }
                entries.push(key)
            }
            return entries
        },
        symlink: function(parent, newname, oldpath) {
            var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
            node.link = oldpath;
            return node
        },
        readlink: function(node) {
            if (!FS.isLink(node.mode)) {
                throw new FS.ErrnoError(28)
            }
            return node.link
        }
    },
    stream_ops: {
        read: function(stream, buffer, offset, length, position) {
            var contents = stream.node.contents;
            if (position >= stream.node.usedBytes)
                return 0;
            var size = Math.min(stream.node.usedBytes - position, length);
            if (size > 8 && contents.subarray) {
                buffer.set(contents.subarray(position, position + size), offset)
            } else {
                for (var i = 0; i < size; i++)
                    buffer[offset + i] = contents[position + i]
            }
            return size
        },
        write: function(stream, buffer, offset, length, position, canOwn) {
            if (buffer.buffer === HEAP8.buffer) {
                canOwn = false
            }
            if (!length)
                return 0;
            var node = stream.node;
            node.timestamp = Date.now();
            if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                if (canOwn) {
                    node.contents = buffer.subarray(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (node.usedBytes === 0 && position === 0) {
                    node.contents = buffer.slice(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length
                }
            }
            MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray) {
                node.contents.set(buffer.subarray(offset, offset + length), position)
            } else {
                for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i]
                }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length
        },
        llseek: function(stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    position += stream.node.usedBytes
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(28)
            }
            return position
        },
        allocate: function(stream, offset, length) {
            MEMFS.expandFileStorage(stream.node, offset + length);
            stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
        },
        mmap: function(stream, address, length, position, prot, flags) {
            if (address !== 0) {
                throw new FS.ErrnoError(28)
            }
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(43)
            }
            var ptr;
            var allocated;
            var contents = stream.node.contents;
            if (!(flags & 2) && contents.buffer === buffer) {
                allocated = false;
                ptr = contents.byteOffset
            } else {
                if (position > 0 || position + length < contents.length) {
                    if (contents.subarray) {
                        contents = contents.subarray(position, position + length)
                    } else {
                        contents = Array.prototype.slice.call(contents, position, position + length)
                    }
                }
                allocated = true;
                ptr = mmapAlloc(length);
                if (!ptr) {
                    throw new FS.ErrnoError(48)
                }
                HEAP8.set(contents, ptr)
            }
            return {
                ptr: ptr,
                allocated: allocated
            }
        },
        msync: function(stream, buffer, offset, length, mmapFlags) {
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(43)
            }
            if (mmapFlags & 2) {
                return 0
            }
            var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
            return 0
        }
    }
};
var FS = {
    root: null,
    mounts: [],
    devices: {},
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    trackingDelegate: {},
    tracking: {
        openFlags: {
            READ: 1,
            WRITE: 2
        }
    },
    ErrnoError: null,
    genericErrors: {},
    filesystems: null,
    syncFSRequests: 0,
    lookupPath: function(path, opts) {
        path = PATH_FS.resolve(FS.cwd(), path);
        opts = opts || {};
        if (!path)
            return {
                path: "",
                node: null
            };
        var defaults = {
            follow_mount: true,
            recurse_count: 0
        };
        for (var key in defaults) {
            if (opts[key] === undefined) {
                opts[key] = defaults[key]
            }
        }
        if (opts.recurse_count > 8) {
            throw new FS.ErrnoError(32)
        }
        var parts = PATH.normalizeArray(path.split("/").filter(function(p) {
            return !!p
        }), false);
        var current = FS.root;
        var current_path = "/";
        for (var i = 0; i < parts.length; i++) {
            var islast = i === parts.length - 1;
            if (islast && opts.parent) {
                break
            }
            current = FS.lookupNode(current, parts[i]);
            current_path = PATH.join2(current_path, parts[i]);
            if (FS.isMountpoint(current)) {
                if (!islast || islast && opts.follow_mount) {
                    current = current.mounted.root
                }
            }
            if (!islast || opts.follow) {
                var count = 0;
                while (FS.isLink(current.mode)) {
                    var link = FS.readlink(current_path);
                    current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
                    var lookup = FS.lookupPath(current_path, {
                        recurse_count: opts.recurse_count
                    });
                    current = lookup.node;
                    if (count++ > 40) {
                        throw new FS.ErrnoError(32)
                    }
                }
            }
        }
        return {
            path: current_path,
            node: current
        }
    },
    getPath: function(node) {
        var path;
        while (true) {
            if (FS.isRoot(node)) {
                var mount = node.mount.mountpoint;
                if (!path)
                    return mount;
                return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
            }
            path = path ? node.name + "/" + path : node.name;
            node = node.parent
        }
    },
    hashName: function(parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = (hash << 5) - hash + name.charCodeAt(i) | 0
        }
        return (parentid + hash >>> 0) % FS.nameTable.length
    },
    hashAddNode: function(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node
    },
    hashRemoveNode: function(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
            FS.nameTable[hash] = node.name_next
        } else {
            var current = FS.nameTable[hash];
            while (current) {
                if (current.name_next === node) {
                    current.name_next = node.name_next;
                    break
                }
                current = current.name_next
            }
        }
    },
    lookupNode: function(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
            throw new FS.ErrnoError(errCode,parent)
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
            var nodeName = node.name;
            if (node.parent.id === parent.id && nodeName === name) {
                return node
            }
        }
        return FS.lookup(parent, name)
    },
    createNode: function(parent, name, mode, rdev) {
        var node = new FS.FSNode(parent,name,mode,rdev);
        FS.hashAddNode(node);
        return node
    },
    destroyNode: function(node) {
        FS.hashRemoveNode(node)
    },
    isRoot: function(node) {
        return node === node.parent
    },
    isMountpoint: function(node) {
        return !!node.mounted
    },
    isFile: function(mode) {
        return (mode & 61440) === 32768
    },
    isDir: function(mode) {
        return (mode & 61440) === 16384
    },
    isLink: function(mode) {
        return (mode & 61440) === 40960
    },
    isChrdev: function(mode) {
        return (mode & 61440) === 8192
    },
    isBlkdev: function(mode) {
        return (mode & 61440) === 24576
    },
    isFIFO: function(mode) {
        return (mode & 61440) === 4096
    },
    isSocket: function(mode) {
        return (mode & 49152) === 49152
    },
    flagModes: {
        "r": 0,
        "r+": 2,
        "w": 577,
        "w+": 578,
        "a": 1089,
        "a+": 1090
    },
    modeStringToFlags: function(str) {
        var flags = FS.flagModes[str];
        if (typeof flags === "undefined") {
            throw new Error("Unknown file open mode: " + str)
        }
        return flags
    },
    flagsToPermissionString: function(flag) {
        var perms = ["r", "w", "rw"][flag & 3];
        if (flag & 512) {
            perms += "w"
        }
        return perms
    },
    nodePermissions: function(node, perms) {
        if (FS.ignorePermissions) {
            return 0
        }
        if (perms.includes("r") && !(node.mode & 292)) {
            return 2
        } else if (perms.includes("w") && !(node.mode & 146)) {
            return 2
        } else if (perms.includes("x") && !(node.mode & 73)) {
            return 2
        }
        return 0
    },
    mayLookup: function(dir) {
        var errCode = FS.nodePermissions(dir, "x");
        if (errCode)
            return errCode;
        if (!dir.node_ops.lookup)
            return 2;
        return 0
    },
    mayCreate: function(dir, name) {
        try {
            var node = FS.lookupNode(dir, name);
            return 20
        } catch (e) {}
        return FS.nodePermissions(dir, "wx")
    },
    mayDelete: function(dir, name, isdir) {
        var node;
        try {
            node = FS.lookupNode(dir, name)
        } catch (e) {
            return e.errno
        }
        var errCode = FS.nodePermissions(dir, "wx");
        if (errCode) {
            return errCode
        }
        if (isdir) {
            if (!FS.isDir(node.mode)) {
                return 54
            }
            if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
                return 10
            }
        } else {
            if (FS.isDir(node.mode)) {
                return 31
            }
        }
        return 0
    },
    mayOpen: function(node, flags) {
        if (!node) {
            return 44
        }
        if (FS.isLink(node.mode)) {
            return 32
        } else if (FS.isDir(node.mode)) {
            if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
                return 31
            }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
    },
    MAX_OPEN_FDS: 4096,
    nextfd: function(fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
            if (!FS.streams[fd]) {
                return fd
            }
        }
        throw new FS.ErrnoError(33)
    },
    getStream: function(fd) {
        return FS.streams[fd]
    },
    createStream: function(stream, fd_start, fd_end) {
        if (!FS.FSStream) {
            FS.FSStream = function() {}
            ;
            FS.FSStream.prototype = {
                object: {
                    get: function() {
                        return this.node
                    },
                    set: function(val) {
                        this.node = val
                    }
                },
                isRead: {
                    get: function() {
                        return (this.flags & 2097155) !== 1
                    }
                },
                isWrite: {
                    get: function() {
                        return (this.flags & 2097155) !== 0
                    }
                },
                isAppend: {
                    get: function() {
                        return this.flags & 1024
                    }
                }
            }
        }
        var newStream = new FS.FSStream;
        for (var p in stream) {
            newStream[p] = stream[p]
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream
    },
    closeStream: function(fd) {
        FS.streams[fd] = null
    },
    chrdev_stream_ops: {
        open: function(stream) {
            var device = FS.getDevice(stream.node.rdev);
            stream.stream_ops = device.stream_ops;
            if (stream.stream_ops.open) {
                stream.stream_ops.open(stream)
            }
        },
        llseek: function() {
            throw new FS.ErrnoError(70)
        }
    },
    major: function(dev) {
        return dev >> 8
    },
    minor: function(dev) {
        return dev & 255
    },
    makedev: function(ma, mi) {
        return ma << 8 | mi
    },
    registerDevice: function(dev, ops) {
        FS.devices[dev] = {
            stream_ops: ops
        }
    },
    getDevice: function(dev) {
        return FS.devices[dev]
    },
    getMounts: function(mount) {
        var mounts = [];
        var check = [mount];
        while (check.length) {
            var m = check.pop();
            mounts.push(m);
            check.push.apply(check, m.mounts)
        }
        return mounts
    },
    syncfs: function(populate, callback) {
        if (typeof populate === "function") {
            callback = populate;
            populate = false
        }
        FS.syncFSRequests++;
        if (FS.syncFSRequests > 1) {
            err("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work")
        }
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
        function doCallback(errCode) {
            FS.syncFSRequests--;
            return callback(errCode)
        }
        function done(errCode) {
            if (errCode) {
                if (!done.errored) {
                    done.errored = true;
                    return doCallback(errCode)
                }
                return
            }
            if (++completed >= mounts.length) {
                doCallback(null)
            }
        }
        mounts.forEach(function(mount) {
            if (!mount.type.syncfs) {
                return done(null)
            }
            mount.type.syncfs(mount, populate, done)
        })
    },
    mount: function(type, opts, mountpoint) {
        var root = mountpoint === "/";
        var pseudo = !mountpoint;
        var node;
        if (root && FS.root) {
            throw new FS.ErrnoError(10)
        } else if (!root && !pseudo) {
            var lookup = FS.lookupPath(mountpoint, {
                follow_mount: false
            });
            mountpoint = lookup.path;
            node = lookup.node;
            if (FS.isMountpoint(node)) {
                throw new FS.ErrnoError(10)
            }
            if (!FS.isDir(node.mode)) {
                throw new FS.ErrnoError(54)
            }
        }
        var mount = {
            type: type,
            opts: opts,
            mountpoint: mountpoint,
            mounts: []
        };
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
        if (root) {
            FS.root = mountRoot
        } else if (node) {
            node.mounted = mount;
            if (node.mount) {
                node.mount.mounts.push(mount)
            }
        }
        return mountRoot
    },
    unmount: function(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, {
            follow_mount: false
        });
        if (!FS.isMountpoint(lookup.node)) {
            throw new FS.ErrnoError(28)
        }
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
        Object.keys(FS.nameTable).forEach(function(hash) {
            var current = FS.nameTable[hash];
            while (current) {
                var next = current.name_next;
                if (mounts.includes(current.mount)) {
                    FS.destroyNode(current)
                }
                current = next
            }
        });
        node.mounted = null;
        var idx = node.mount.mounts.indexOf(mount);
        node.mount.mounts.splice(idx, 1)
    },
    lookup: function(parent, name) {
        return parent.node_ops.lookup(parent, name)
    },
    mknod: function(path, mode, dev) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === "." || name === "..") {
            throw new FS.ErrnoError(28)
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.mknod) {
            throw new FS.ErrnoError(63)
        }
        return parent.node_ops.mknod(parent, name, mode, dev)
    },
    create: function(path, mode) {
        mode = mode !== undefined ? mode : 438;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0)
    },
    mkdir: function(path, mode) {
        mode = mode !== undefined ? mode : 511;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0)
    },
    mkdirTree: function(path, mode) {
        var dirs = path.split("/");
        var d = "";
        for (var i = 0; i < dirs.length; ++i) {
            if (!dirs[i])
                continue;
            d += "/" + dirs[i];
            try {
                FS.mkdir(d, mode)
            } catch (e) {
                if (e.errno != 20)
                    throw e
            }
        }
    },
    mkdev: function(path, mode, dev) {
        if (typeof dev === "undefined") {
            dev = mode;
            mode = 438
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev)
    },
    symlink: function(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
            throw new FS.ErrnoError(44)
        }
        var lookup = FS.lookupPath(newpath, {
            parent: true
        });
        var parent = lookup.node;
        if (!parent) {
            throw new FS.ErrnoError(44)
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.symlink) {
            throw new FS.ErrnoError(63)
        }
        return parent.node_ops.symlink(parent, newname, oldpath)
    },
    rename: function(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        var lookup, old_dir, new_dir;
        lookup = FS.lookupPath(old_path, {
            parent: true
        });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, {
            parent: true
        });
        new_dir = lookup.node;
        if (!old_dir || !new_dir)
            throw new FS.ErrnoError(44);
        if (old_dir.mount !== new_dir.mount) {
            throw new FS.ErrnoError(75)
        }
        var old_node = FS.lookupNode(old_dir, old_name);
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(28)
        }
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(55)
        }
        var new_node;
        try {
            new_node = FS.lookupNode(new_dir, new_name)
        } catch (e) {}
        if (old_node === new_node) {
            return
        }
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!old_dir.node_ops.rename) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
            throw new FS.ErrnoError(10)
        }
        if (new_dir !== old_dir) {
            errCode = FS.nodePermissions(old_dir, "w");
            if (errCode) {
                throw new FS.ErrnoError(errCode)
            }
        }
        try {
            if (FS.trackingDelegate["willMovePath"]) {
                FS.trackingDelegate["willMovePath"](old_path, new_path)
            }
        } catch (e) {
            err("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
        FS.hashRemoveNode(old_node);
        try {
            old_dir.node_ops.rename(old_node, new_dir, new_name)
        } catch (e) {
            throw e
        } finally {
            FS.hashAddNode(old_node)
        }
        try {
            if (FS.trackingDelegate["onMovePath"])
                FS.trackingDelegate["onMovePath"](old_path, new_path)
        } catch (e) {
            err("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
    },
    rmdir: function(path) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.rmdir) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            err("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"])
                FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            err("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    },
    readdir: function(path) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
            throw new FS.ErrnoError(54)
        }
        return node.node_ops.readdir(node)
    },
    unlink: function(path) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.unlink) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            err("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"])
                FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            err("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    },
    readlink: function(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
            throw new FS.ErrnoError(44)
        }
        if (!link.node_ops.readlink) {
            throw new FS.ErrnoError(28)
        }
        return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link))
    },
    stat: function(path, dontFollow) {
        var lookup = FS.lookupPath(path, {
            follow: !dontFollow
        });
        var node = lookup.node;
        if (!node) {
            throw new FS.ErrnoError(44)
        }
        if (!node.node_ops.getattr) {
            throw new FS.ErrnoError(63)
        }
        return node.node_ops.getattr(node)
    },
    lstat: function(path) {
        return FS.stat(path, true)
    },
    chmod: function(path, mode, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        node.node_ops.setattr(node, {
            mode: mode & 4095 | node.mode & ~4095,
            timestamp: Date.now()
        })
    },
    lchmod: function(path, mode) {
        FS.chmod(path, mode, true)
    },
    fchmod: function(fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        FS.chmod(stream.node, mode)
    },
    chown: function(path, uid, gid, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        node.node_ops.setattr(node, {
            timestamp: Date.now()
        })
    },
    lchown: function(path, uid, gid) {
        FS.chown(path, uid, gid, true)
    },
    fchown: function(fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        FS.chown(stream.node, uid, gid)
    },
    truncate: function(path, len) {
        if (len < 0) {
            throw new FS.ErrnoError(28)
        }
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: true
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isDir(node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!FS.isFile(node.mode)) {
            throw new FS.ErrnoError(28)
        }
        var errCode = FS.nodePermissions(node, "w");
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        node.node_ops.setattr(node, {
            size: len,
            timestamp: Date.now()
        })
    },
    ftruncate: function(fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(28)
        }
        FS.truncate(stream.node, len)
    },
    utime: function(path, atime, mtime) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        node.node_ops.setattr(node, {
            timestamp: Math.max(atime, mtime)
        })
    },
    open: function(path, flags, mode, fd_start, fd_end) {
        if (path === "") {
            throw new FS.ErrnoError(44)
        }
        flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === "undefined" ? 438 : mode;
        if (flags & 64) {
            mode = mode & 4095 | 32768
        } else {
            mode = 0
        }
        var node;
        if (typeof path === "object") {
            node = path
        } else {
            path = PATH.normalize(path);
            try {
                var lookup = FS.lookupPath(path, {
                    follow: !(flags & 131072)
                });
                node = lookup.node
            } catch (e) {}
        }
        var created = false;
        if (flags & 64) {
            if (node) {
                if (flags & 128) {
                    throw new FS.ErrnoError(20)
                }
            } else {
                node = FS.mknod(path, mode, 0);
                created = true
            }
        }
        if (!node) {
            throw new FS.ErrnoError(44)
        }
        if (FS.isChrdev(node.mode)) {
            flags &= ~512
        }
        if (flags & 65536 && !FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54)
        }
        if (!created) {
            var errCode = FS.mayOpen(node, flags);
            if (errCode) {
                throw new FS.ErrnoError(errCode)
            }
        }
        if (flags & 512) {
            FS.truncate(node, 0)
        }
        flags &= ~(128 | 512 | 131072);
        var stream = FS.createStream({
            node: node,
            path: FS.getPath(node),
            flags: flags,
            seekable: true,
            position: 0,
            stream_ops: node.stream_ops,
            ungotten: [],
            error: false
        }, fd_start, fd_end);
        if (stream.stream_ops.open) {
            stream.stream_ops.open(stream)
        }
        if (Module["logReadFiles"] && !(flags & 1)) {
            if (!FS.readFiles)
                FS.readFiles = {};
            if (!(path in FS.readFiles)) {
                FS.readFiles[path] = 1;
                err("FS.trackingDelegate error on read file: " + path)
            }
        }
        try {
            if (FS.trackingDelegate["onOpenFile"]) {
                var trackingFlags = 0;
                if ((flags & 2097155) !== 1) {
                    trackingFlags |= FS.tracking.openFlags.READ
                }
                if ((flags & 2097155) !== 0) {
                    trackingFlags |= FS.tracking.openFlags.WRITE
                }
                FS.trackingDelegate["onOpenFile"](path, trackingFlags)
            }
        } catch (e) {
            err("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)
        }
        return stream
    },
    close: function(stream) {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (stream.getdents)
            stream.getdents = null;
        try {
            if (stream.stream_ops.close) {
                stream.stream_ops.close(stream)
            }
        } catch (e) {
            throw e
        } finally {
            FS.closeStream(stream.fd)
        }
        stream.fd = null
    },
    isClosed: function(stream) {
        return stream.fd === null
    },
    llseek: function(stream, offset, whence) {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
            throw new FS.ErrnoError(70)
        }
        if (whence != 0 && whence != 1 && whence != 2) {
            throw new FS.ErrnoError(28)
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position
    },
    read: function(stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(28)
        }
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(8)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!stream.stream_ops.read) {
            throw new FS.ErrnoError(28)
        }
        var seeking = typeof position !== "undefined";
        if (!seeking) {
            position = stream.position
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(70)
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking)
            stream.position += bytesRead;
        return bytesRead
    },
    write: function(stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(28)
        }
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(8)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!stream.stream_ops.write) {
            throw new FS.ErrnoError(28)
        }
        if (stream.seekable && stream.flags & 1024) {
            FS.llseek(stream, 0, 2)
        }
        var seeking = typeof position !== "undefined";
        if (!seeking) {
            position = stream.position
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(70)
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking)
            stream.position += bytesWritten;
        try {
            if (stream.path && FS.trackingDelegate["onWriteToFile"])
                FS.trackingDelegate["onWriteToFile"](stream.path)
        } catch (e) {
            err("FS.trackingDelegate['onWriteToFile']('" + stream.path + "') threw an exception: " + e.message)
        }
        return bytesWritten
    },
    allocate: function(stream, offset, length) {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (offset < 0 || length <= 0) {
            throw new FS.ErrnoError(28)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(8)
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(43)
        }
        if (!stream.stream_ops.allocate) {
            throw new FS.ErrnoError(138)
        }
        stream.stream_ops.allocate(stream, offset, length)
    },
    mmap: function(stream, address, length, position, prot, flags) {
        if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
            throw new FS.ErrnoError(2)
        }
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(2)
        }
        if (!stream.stream_ops.mmap) {
            throw new FS.ErrnoError(43)
        }
        return stream.stream_ops.mmap(stream, address, length, position, prot, flags)
    },
    msync: function(stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
            return 0
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
    },
    munmap: function(stream) {
        return 0
    },
    ioctl: function(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
            throw new FS.ErrnoError(59)
        }
        return stream.stream_ops.ioctl(stream, cmd, arg)
    },
    readFile: function(path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || "binary";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
            throw new Error('Invalid encoding type "' + opts.encoding + '"')
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === "utf8") {
            ret = UTF8ArrayToString(buf, 0)
        } else if (opts.encoding === "binary") {
            ret = buf
        }
        FS.close(stream);
        return ret
    },
    writeFile: function(path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data === "string") {
            var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
            var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
            FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn)
        } else if (ArrayBuffer.isView(data)) {
            FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn)
        } else {
            throw new Error("Unsupported data type")
        }
        FS.close(stream)
    },
    cwd: function() {
        return FS.currentPath
    },
    chdir: function(path) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        if (lookup.node === null) {
            throw new FS.ErrnoError(44)
        }
        if (!FS.isDir(lookup.node.mode)) {
            throw new FS.ErrnoError(54)
        }
        var errCode = FS.nodePermissions(lookup.node, "x");
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        FS.currentPath = lookup.path
    },
    createDefaultDirectories: function() {
        FS.mkdir("/tmp");
        FS.mkdir("/home");
        FS.mkdir("/home/web_user")
    },
    createDefaultDevices: function() {
        FS.mkdir("/dev");
        FS.registerDevice(FS.makedev(1, 3), {
            read: function() {
                return 0
            },
            write: function(stream, buffer, offset, length, pos) {
                return length
            }
        });
        FS.mkdev("/dev/null", FS.makedev(1, 3));
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev("/dev/tty", FS.makedev(5, 0));
        FS.mkdev("/dev/tty1", FS.makedev(6, 0));
        var random_device = getRandomDevice();
        FS.createDevice("/dev", "random", random_device);
        FS.createDevice("/dev", "urandom", random_device);
        FS.mkdir("/dev/shm");
        FS.mkdir("/dev/shm/tmp")
    },
    createSpecialDirectories: function() {
        FS.mkdir("/proc");
        var proc_self = FS.mkdir("/proc/self");
        FS.mkdir("/proc/self/fd");
        FS.mount({
            mount: function() {
                var node = FS.createNode(proc_self, "fd", 16384 | 511, 73);
                node.node_ops = {
                    lookup: function(parent, name) {
                        var fd = +name;
                        var stream = FS.getStream(fd);
                        if (!stream)
                            throw new FS.ErrnoError(8);
                        var ret = {
                            parent: null,
                            mount: {
                                mountpoint: "fake"
                            },
                            node_ops: {
                                readlink: function() {
                                    return stream.path
                                }
                            }
                        };
                        ret.parent = ret;
                        return ret
                    }
                };
                return node
            }
        }, {}, "/proc/self/fd")
    },
    createStandardStreams: function() {
        if (Module["stdin"]) {
            FS.createDevice("/dev", "stdin", Module["stdin"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdin")
        }
        if (Module["stdout"]) {
            FS.createDevice("/dev", "stdout", null, Module["stdout"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdout")
        }
        if (Module["stderr"]) {
            FS.createDevice("/dev", "stderr", null, Module["stderr"])
        } else {
            FS.symlink("/dev/tty1", "/dev/stderr")
        }
        var stdin = FS.open("/dev/stdin", 0);
        var stdout = FS.open("/dev/stdout", 1);
        var stderr = FS.open("/dev/stderr", 1)
    },
    ensureErrnoError: function() {
        if (FS.ErrnoError)
            return;
        FS.ErrnoError = function ErrnoError(errno, node) {
            this.node = node;
            this.setErrno = function(errno) {
                this.errno = errno
            }
            ;
            this.setErrno(errno);
            this.message = "FS error"
        }
        ;
        FS.ErrnoError.prototype = new Error;
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        [44].forEach(function(code) {
            FS.genericErrors[code] = new FS.ErrnoError(code);
            FS.genericErrors[code].stack = "<generic error, no stack>"
        })
    },
    staticInit: function() {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.mount(MEMFS, {}, "/");
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
        FS.filesystems = {
            "MEMFS": MEMFS
        }
    },
    init: function(input, output, error) {
        FS.init.initialized = true;
        FS.ensureErrnoError();
        Module["stdin"] = input || Module["stdin"];
        Module["stdout"] = output || Module["stdout"];
        Module["stderr"] = error || Module["stderr"];
        FS.createStandardStreams()
    },
    quit: function() {
        FS.init.initialized = false;
        var fflush = Module["_fflush"];
        if (fflush)
            fflush(0);
        for (var i = 0; i < FS.streams.length; i++) {
            var stream = FS.streams[i];
            if (!stream) {
                continue
            }
            FS.close(stream)
        }
    },
    getMode: function(canRead, canWrite) {
        var mode = 0;
        if (canRead)
            mode |= 292 | 73;
        if (canWrite)
            mode |= 146;
        return mode
    },
    findObject: function(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
            return ret.object
        } else {
            return null
        }
    },
    analyzePath: function(path, dontResolveLastLink) {
        try {
            var lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            path = lookup.path
        } catch (e) {}
        var ret = {
            isRoot: false,
            exists: false,
            error: 0,
            name: null,
            path: null,
            object: null,
            parentExists: false,
            parentPath: null,
            parentObject: null
        };
        try {
            var lookup = FS.lookupPath(path, {
                parent: true
            });
            ret.parentExists = true;
            ret.parentPath = lookup.path;
            ret.parentObject = lookup.node;
            ret.name = PATH.basename(path);
            lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            ret.exists = true;
            ret.path = lookup.path;
            ret.object = lookup.node;
            ret.name = lookup.node.name;
            ret.isRoot = lookup.path === "/"
        } catch (e) {
            ret.error = e.errno
        }
        return ret
    },
    createPath: function(parent, path, canRead, canWrite) {
        parent = typeof parent === "string" ? parent : FS.getPath(parent);
        var parts = path.split("/").reverse();
        while (parts.length) {
            var part = parts.pop();
            if (!part)
                continue;
            var current = PATH.join2(parent, part);
            try {
                FS.mkdir(current)
            } catch (e) {}
            parent = current
        }
        return current
    },
    createFile: function(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode)
    },
    createDataFile: function(parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
            if (typeof data === "string") {
                var arr = new Array(data.length);
                for (var i = 0, len = data.length; i < len; ++i)
                    arr[i] = data.charCodeAt(i);
                data = arr
            }
            FS.chmod(node, mode | 146);
            var stream = FS.open(node, 577);
            FS.write(stream, data, 0, data.length, 0, canOwn);
            FS.close(stream);
            FS.chmod(node, mode)
        }
        return node
    },
    createDevice: function(parent, name, input, output) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major)
            FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        FS.registerDevice(dev, {
            open: function(stream) {
                stream.seekable = false
            },
            close: function(stream) {
                if (output && output.buffer && output.buffer.length) {
                    output(10)
                }
            },
            read: function(stream, buffer, offset, length, pos) {
                var bytesRead = 0;
                for (var i = 0; i < length; i++) {
                    var result;
                    try {
                        result = input()
                    } catch (e) {
                        throw new FS.ErrnoError(29)
                    }
                    if (result === undefined && bytesRead === 0) {
                        throw new FS.ErrnoError(6)
                    }
                    if (result === null || result === undefined)
                        break;
                    bytesRead++;
                    buffer[offset + i] = result
                }
                if (bytesRead) {
                    stream.node.timestamp = Date.now()
                }
                return bytesRead
            },
            write: function(stream, buffer, offset, length, pos) {
                for (var i = 0; i < length; i++) {
                    try {
                        output(buffer[offset + i])
                    } catch (e) {
                        throw new FS.ErrnoError(29)
                    }
                }
                if (length) {
                    stream.node.timestamp = Date.now()
                }
                return i
            }
        });
        return FS.mkdev(path, mode, dev)
    },
    forceLoadFile: function(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents)
            return true;
        if (typeof XMLHttpRequest !== "undefined") {
            throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
        } else if (read_) {
            try {
                obj.contents = intArrayFromString(read_(obj.url), true);
                obj.usedBytes = obj.contents.length
            } catch (e) {
                throw new FS.ErrnoError(29)
            }
        } else {
            throw new Error("Cannot load without read() or XMLHttpRequest.")
        }
    },
    createLazyFile: function(parent, name, url, canRead, canWrite) {
        function LazyUint8Array() {
            this.lengthKnown = false;
            this.chunks = []
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
            if (idx > this.length - 1 || idx < 0) {
                return undefined
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = idx / this.chunkSize | 0;
            return this.getter(chunkNum)[chunkOffset]
        }
        ;
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter
        }
        ;
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
            var xhr = new XMLHttpRequest;
            xhr.open("HEAD", url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
                throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
            var chunkSize = 1024 * 1024;
            if (!hasByteServing)
                chunkSize = datalength;
            var doXHR = function(from, to) {
                if (from > to)
                    throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength - 1)
                    throw new Error("only " + datalength + " bytes available! programmer error!");
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                if (datalength !== chunkSize)
                    xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                if (typeof Uint8Array != "undefined")
                    xhr.responseType = "arraybuffer";
                if (xhr.overrideMimeType) {
                    xhr.overrideMimeType("text/plain; charset=x-user-defined")
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
                    throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                    return new Uint8Array(xhr.response || [])
                } else {
                    return intArrayFromString(xhr.responseText || "", true)
                }
            };
            var lazyArray = this;
            lazyArray.setDataGetter(function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum + 1) * chunkSize - 1;
                end = Math.min(end, datalength - 1);
                if (typeof lazyArray.chunks[chunkNum] === "undefined") {
                    lazyArray.chunks[chunkNum] = doXHR(start, end)
                }
                if (typeof lazyArray.chunks[chunkNum] === "undefined")
                    throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum]
            });
            if (usesGzip || !datalength) {
                chunkSize = datalength = 1;
                datalength = this.getter(0).length;
                chunkSize = datalength;
                out("LazyFiles on gzip forces download of the whole file when length is accessed")
            }
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true
        }
        ;
        if (typeof XMLHttpRequest !== "undefined") {
            if (!ENVIRONMENT_IS_WORKER)
                throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
            var lazyArray = new LazyUint8Array;
            Object.defineProperties(lazyArray, {
                length: {
                    get: function() {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._length
                    }
                },
                chunkSize: {
                    get: function() {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._chunkSize
                    }
                }
            });
            var properties = {
                isDevice: false,
                contents: lazyArray
            }
        } else {
            var properties = {
                isDevice: false,
                url: url
            }
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        if (properties.contents) {
            node.contents = properties.contents
        } else if (properties.url) {
            node.contents = null;
            node.url = properties.url
        }
        Object.defineProperties(node, {
            usedBytes: {
                get: function() {
                    return this.contents.length
                }
            }
        });
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
            var fn = node.stream_ops[key];
            stream_ops[key] = function forceLoadLazyFile() {
                FS.forceLoadFile(node);
                return fn.apply(null, arguments)
            }
        });
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
            FS.forceLoadFile(node);
            var contents = stream.node.contents;
            if (position >= contents.length)
                return 0;
            var size = Math.min(contents.length - position, length);
            if (contents.slice) {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents[position + i]
                }
            } else {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents.get(position + i)
                }
            }
            return size
        }
        ;
        node.stream_ops = stream_ops;
        return node
    },
    createPreloadedFile: function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency("cp " + fullname);
        function processData(byteArray) {
            function finish(byteArray) {
                if (preFinish)
                    preFinish();
                if (!dontCreateFile) {
                    FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
                }
                if (onload)
                    onload();
                removeRunDependency(dep)
            }
            var handled = false;
            Module["preloadPlugins"].forEach(function(plugin) {
                if (handled)
                    return;
                if (plugin["canHandle"](fullname)) {
                    plugin["handle"](byteArray, fullname, finish, function() {
                        if (onerror)
                            onerror();
                        removeRunDependency(dep)
                    });
                    handled = true
                }
            });
            if (!handled)
                finish(byteArray)
        }
        addRunDependency(dep);
        if (typeof url == "string") {
            Browser.asyncLoad(url, function(byteArray) {
                processData(byteArray)
            }, onerror)
        } else {
            processData(url)
        }
    },
    indexedDB: function() {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
    },
    DB_NAME: function() {
        return "EM_FS_" + window.location.pathname
    },
    DB_VERSION: 20,
    DB_STORE_NAME: "FILE_DATA",
    saveFilesToDB: function(paths, onload, onerror) {
        onload = onload || function() {}
        ;
        onerror = onerror || function() {}
        ;
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
            out("creating db");
            var db = openRequest.result;
            db.createObjectStore(FS.DB_STORE_NAME)
        }
        ;
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0
              , fail = 0
              , total = paths.length;
            function finish() {
                if (fail == 0)
                    onload();
                else
                    onerror()
            }
            paths.forEach(function(path) {
                var putRequest = files.put(FS.analyzePath(path).object.contents, path);
                putRequest.onsuccess = function putRequest_onsuccess() {
                    ok++;
                    if (ok + fail == total)
                        finish()
                }
                ;
                putRequest.onerror = function putRequest_onerror() {
                    fail++;
                    if (ok + fail == total)
                        finish()
                }
            });
            transaction.onerror = onerror
        }
        ;
        openRequest.onerror = onerror
    },
    loadFilesFromDB: function(paths, onload, onerror) {
        onload = onload || function() {}
        ;
        onerror = onerror || function() {}
        ;
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = onerror;
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            try {
                var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
            } catch (e) {
                onerror(e);
                return
            }
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0
              , fail = 0
              , total = paths.length;
            function finish() {
                if (fail == 0)
                    onload();
                else
                    onerror()
            }
            paths.forEach(function(path) {
                var getRequest = files.get(path);
                getRequest.onsuccess = function getRequest_onsuccess() {
                    if (FS.analyzePath(path).exists) {
                        FS.unlink(path)
                    }
                    FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
                    ok++;
                    if (ok + fail == total)
                        finish()
                }
                ;
                getRequest.onerror = function getRequest_onerror() {
                    fail++;
                    if (ok + fail == total)
                        finish()
                }
            });
            transaction.onerror = onerror
        }
        ;
        openRequest.onerror = onerror
    }
};
var SYSCALLS = {
    mappings: {},
    DEFAULT_POLLMASK: 5,
    umask: 511,
    calculateAt: function(dirfd, path, allowEmpty) {
        if (path[0] === "/") {
            return path
        }
        var dir;
        if (dirfd === -100) {
            dir = FS.cwd()
        } else {
            var dirstream = FS.getStream(dirfd);
            if (!dirstream)
                throw new FS.ErrnoError(8);
            dir = dirstream.path
        }
        if (path.length == 0) {
            if (!allowEmpty) {
                throw new FS.ErrnoError(44)
            }
            return dir
        }
        return PATH.join2(dir, path)
    },
    doStat: function(func, path, buf) {
        try {
            var stat = func(path)
        } catch (e) {
            if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
                return -54
            }
            throw e
        }
        HEAP32[buf >> 2] = stat.dev;
        HEAP32[buf + 4 >> 2] = 0;
        HEAP32[buf + 8 >> 2] = stat.ino;
        HEAP32[buf + 12 >> 2] = stat.mode;
        HEAP32[buf + 16 >> 2] = stat.nlink;
        HEAP32[buf + 20 >> 2] = stat.uid;
        HEAP32[buf + 24 >> 2] = stat.gid;
        HEAP32[buf + 28 >> 2] = stat.rdev;
        HEAP32[buf + 32 >> 2] = 0;
        tempI64 = [stat.size >>> 0, (tempDouble = stat.size,
        +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)],
        HEAP32[buf + 40 >> 2] = tempI64[0],
        HEAP32[buf + 44 >> 2] = tempI64[1];
        HEAP32[buf + 48 >> 2] = 4096;
        HEAP32[buf + 52 >> 2] = stat.blocks;
        HEAP32[buf + 56 >> 2] = stat.atime.getTime() / 1e3 | 0;
        HEAP32[buf + 60 >> 2] = 0;
        HEAP32[buf + 64 >> 2] = stat.mtime.getTime() / 1e3 | 0;
        HEAP32[buf + 68 >> 2] = 0;
        HEAP32[buf + 72 >> 2] = stat.ctime.getTime() / 1e3 | 0;
        HEAP32[buf + 76 >> 2] = 0;
        tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino,
        +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)],
        HEAP32[buf + 80 >> 2] = tempI64[0],
        HEAP32[buf + 84 >> 2] = tempI64[1];
        return 0
    },
    doMsync: function(addr, stream, len, flags, offset) {
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags)
    },
    doMkdir: function(path, mode) {
        path = PATH.normalize(path);
        if (path[path.length - 1] === "/")
            path = path.substr(0, path.length - 1);
        FS.mkdir(path, mode, 0);
        return 0
    },
    doMknod: function(path, mode, dev) {
        switch (mode & 61440) {
        case 32768:
        case 8192:
        case 24576:
        case 4096:
        case 49152:
            break;
        default:
            return -28
        }
        FS.mknod(path, mode, dev);
        return 0
    },
    doReadlink: function(path, buf, bufsize) {
        if (bufsize <= 0)
            return -28;
        var ret = FS.readlink(path);
        var len = Math.min(bufsize, lengthBytesUTF8(ret));
        var endChar = HEAP8[buf + len];
        stringToUTF8(ret, buf, bufsize + 1);
        HEAP8[buf + len] = endChar;
        return len
    },
    doAccess: function(path, amode) {
        if (amode & ~7) {
            return -28
        }
        var node;
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        node = lookup.node;
        if (!node) {
            return -44
        }
        var perms = "";
        if (amode & 4)
            perms += "r";
        if (amode & 2)
            perms += "w";
        if (amode & 1)
            perms += "x";
        if (perms && FS.nodePermissions(node, perms)) {
            return -2
        }
        return 0
    },
    doDup: function(path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest)
            FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd
    },
    doReadv: function(stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.read(stream, HEAP8, ptr, len, offset);
            if (curr < 0)
                return -1;
            ret += curr;
            if (curr < len)
                break
        }
        return ret
    },
    doWritev: function(stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.write(stream, HEAP8, ptr, len, offset);
            if (curr < 0)
                return -1;
            ret += curr
        }
        return ret
    },
    varargs: undefined,
    get: function() {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
        return ret
    },
    getStr: function(ptr) {
        var ret = UTF8ToString(ptr);
        return ret
    },
    getStreamFromFD: function(fd) {
        var stream = FS.getStream(fd);
        if (!stream)
            throw new FS.ErrnoError(8);
        return stream
    },
    get64: function(low, high) {
        return low
    }
};
function ___sys_fcntl64(fd, cmd, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (cmd) {
        case 0:
            {
                var arg = SYSCALLS.get();
                if (arg < 0) {
                    return -28
                }
                var newStream;
                newStream = FS.open(stream.path, stream.flags, 0, arg);
                return newStream.fd
            }
        case 1:
        case 2:
            return 0;
        case 3:
            return stream.flags;
        case 4:
            {
                var arg = SYSCALLS.get();
                stream.flags |= arg;
                return 0
            }
        case 12:
            {
                var arg = SYSCALLS.get();
                var offset = 0;
                HEAP16[arg + offset >> 1] = 2;
                return 0
            }
        case 13:
        case 14:
            return 0;
        case 16:
        case 8:
            return -28;
        case 9:
            setErrNo(28);
            return -1;
        default:
            {
                return -28
            }
        }
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function ___sys_ioctl(fd, op, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (op) {
        case 21509:
        case 21505:
            {
                if (!stream.tty)
                    return -59;
                return 0
            }
        case 21510:
        case 21511:
        case 21512:
        case 21506:
        case 21507:
        case 21508:
            {
                if (!stream.tty)
                    return -59;
                return 0
            }
        case 21519:
            {
                if (!stream.tty)
                    return -59;
                var argp = SYSCALLS.get();
                HEAP32[argp >> 2] = 0;
                return 0
            }
        case 21520:
            {
                if (!stream.tty)
                    return -59;
                return -28
            }
        case 21531:
            {
                var argp = SYSCALLS.get();
                return FS.ioctl(stream, op, argp)
            }
        case 21523:
            {
                if (!stream.tty)
                    return -59;
                return 0
            }
        case 21524:
            {
                if (!stream.tty)
                    return -59;
                return 0
            }
        default:
            abort("bad ioctl syscall " + op)
        }
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function ___sys_open(path, flags, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var pathname = SYSCALLS.getStr(path);
        var mode = varargs ? SYSCALLS.get() : 0;
        var stream = FS.open(pathname, flags, mode);
        return stream.fd
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function _abort() {
    abort()
}
var readAsmConstArgsArray = [];
function readAsmConstArgs(sigPtr, buf) {
    readAsmConstArgsArray.length = 0;
    var ch;
    buf >>= 2;
    while (ch = HEAPU8[sigPtr++]) {
        var double = ch < 105;
        if (double && buf & 1)
            buf++;
        readAsmConstArgsArray.push(double ? HEAPF64[buf++ >> 1] : HEAP32[buf]);
        ++buf
    }
    return readAsmConstArgsArray
}
function _emscripten_asm_const_int(code, sigPtr, argbuf) {
    var args = readAsmConstArgs(sigPtr, argbuf);
    return ASM_CONSTS[code].apply(null, args)
}
function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.copyWithin(dest, src, src + num)
}
function emscripten_realloc_buffer(size) {
    try {
        wasmMemory.grow(size - buffer.byteLength + 65535 >>> 16);
        updateGlobalBufferAndViews(wasmMemory.buffer);
        return 1
    } catch (e) {}
}
function _emscripten_resize_heap(requestedSize) {
    var oldSize = HEAPU8.length;
    requestedSize = requestedSize >>> 0;
    var maxHeapSize = 2147483648;
    if (requestedSize > maxHeapSize) {
        return false
    }
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
            return true
        }
    }
    return false
}
var JSEvents = {
    inEventHandler: 0,
    removeAllEventListeners: function() {
        for (var i = JSEvents.eventHandlers.length - 1; i >= 0; --i) {
            JSEvents._removeHandler(i)
        }
        JSEvents.eventHandlers = [];
        JSEvents.deferredCalls = []
    },
    registerRemoveEventListeners: function() {
        if (!JSEvents.removeEventListenersRegistered) {
            __ATEXIT__.push(JSEvents.removeAllEventListeners);
            JSEvents.removeEventListenersRegistered = true
        }
    },
    deferredCalls: [],
    deferCall: function(targetFunction, precedence, argsList) {
        function arraysHaveEqualContent(arrA, arrB) {
            if (arrA.length != arrB.length)
                return false;
            for (var i in arrA) {
                if (arrA[i] != arrB[i])
                    return false
            }
            return true
        }
        for (var i in JSEvents.deferredCalls) {
            var call = JSEvents.deferredCalls[i];
            if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
                return
            }
        }
        JSEvents.deferredCalls.push({
            targetFunction: targetFunction,
            precedence: precedence,
            argsList: argsList
        });
        JSEvents.deferredCalls.sort(function(x, y) {
            return x.precedence < y.precedence
        })
    },
    removeDeferredCalls: function(targetFunction) {
        for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
            if (JSEvents.deferredCalls[i].targetFunction == targetFunction) {
                JSEvents.deferredCalls.splice(i, 1);
                --i
            }
        }
    },
    canPerformEventHandlerRequests: function() {
        return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls
    },
    runDeferredCalls: function() {
        if (!JSEvents.canPerformEventHandlerRequests()) {
            return
        }
        for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
            var call = JSEvents.deferredCalls[i];
            JSEvents.deferredCalls.splice(i, 1);
            --i;
            call.targetFunction.apply(null, call.argsList)
        }
    },
    eventHandlers: [],
    removeAllHandlersOnTarget: function(target, eventTypeString) {
        for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
            if (JSEvents.eventHandlers[i].target == target && (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
                JSEvents._removeHandler(i--)
            }
        }
    },
    _removeHandler: function(i) {
        var h = JSEvents.eventHandlers[i];
        h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
        JSEvents.eventHandlers.splice(i, 1)
    },
    registerOrRemoveHandler: function(eventHandler) {
        var jsEventHandler = function jsEventHandler(event) {
            ++JSEvents.inEventHandler;
            JSEvents.currentEventHandler = eventHandler;
            JSEvents.runDeferredCalls();
            eventHandler.handlerFunc(event);
            JSEvents.runDeferredCalls();
            --JSEvents.inEventHandler
        };
        if (eventHandler.callbackfunc) {
            eventHandler.eventListenerFunc = jsEventHandler;
            eventHandler.target.addEventListener(eventHandler.eventTypeString, jsEventHandler, eventHandler.useCapture);
            JSEvents.eventHandlers.push(eventHandler);
            JSEvents.registerRemoveEventListeners()
        } else {
            for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
                if (JSEvents.eventHandlers[i].target == eventHandler.target && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
                    JSEvents._removeHandler(i--)
                }
            }
        }
    },
    getNodeNameForTarget: function(target) {
        if (!target)
            return "";
        if (target == window)
            return "#window";
        if (target == screen)
            return "#screen";
        return target && target.nodeName ? target.nodeName : ""
    },
    fullscreenEnabled: function() {
        return document.fullscreenEnabled || document.webkitFullscreenEnabled
    }
};
function maybeCStringToJsString(cString) {
    return cString > 2 ? UTF8ToString(cString) : cString
}
var specialHTMLTargets = [0, typeof document !== "undefined" ? document : 0, typeof window !== "undefined" ? window : 0];
function findEventTarget(target) {
    target = maybeCStringToJsString(target);
    var domElement = specialHTMLTargets[target] || (typeof document !== "undefined" ? document.querySelector(target) : undefined);
    return domElement
}
function findCanvasEventTarget(target) {
    return findEventTarget(target)
}
function _emscripten_set_canvas_element_size(target, width, height) {
    var canvas = findCanvasEventTarget(target);
    if (!canvas)
        return -4;
    canvas.width = width;
    canvas.height = height;
    return 0
}
function __webgl_enable_ANGLE_instanced_arrays(ctx) {
    var ext = ctx.getExtension("ANGLE_instanced_arrays");
    if (ext) {
        ctx["vertexAttribDivisor"] = function(index, divisor) {
            ext["vertexAttribDivisorANGLE"](index, divisor)
        }
        ;
        ctx["drawArraysInstanced"] = function(mode, first, count, primcount) {
            ext["drawArraysInstancedANGLE"](mode, first, count, primcount)
        }
        ;
        ctx["drawElementsInstanced"] = function(mode, count, type, indices, primcount) {
            ext["drawElementsInstancedANGLE"](mode, count, type, indices, primcount)
        }
        ;
        return 1
    }
}
function __webgl_enable_OES_vertex_array_object(ctx) {
    var ext = ctx.getExtension("OES_vertex_array_object");
    if (ext) {
        ctx["createVertexArray"] = function() {
            return ext["createVertexArrayOES"]()
        }
        ;
        ctx["deleteVertexArray"] = function(vao) {
            ext["deleteVertexArrayOES"](vao)
        }
        ;
        ctx["bindVertexArray"] = function(vao) {
            ext["bindVertexArrayOES"](vao)
        }
        ;
        ctx["isVertexArray"] = function(vao) {
            return ext["isVertexArrayOES"](vao)
        }
        ;
        return 1
    }
}
function __webgl_enable_WEBGL_draw_buffers(ctx) {
    var ext = ctx.getExtension("WEBGL_draw_buffers");
    if (ext) {
        ctx["drawBuffers"] = function(n, bufs) {
            ext["drawBuffersWEBGL"](n, bufs)
        }
        ;
        return 1
    }
}
function __webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(ctx) {
    return !!(ctx.dibvbi = ctx.getExtension("WEBGL_draw_instanced_base_vertex_base_instance"))
}
function __webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(ctx) {
    return !!(ctx.mdibvbi = ctx.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance"))
}
function __webgl_enable_WEBGL_multi_draw(ctx) {
    return !!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"))
}
var GL = {
    counter: 1,
    buffers: [],
    mappedBuffers: {},
    programs: [],
    framebuffers: [],
    renderbuffers: [],
    textures: [],
    shaders: [],
    vaos: [],
    contexts: [],
    offscreenCanvases: {},
    queries: [],
    samplers: [],
    transformFeedbacks: [],
    syncs: [],
    byteSizeByTypeRoot: 5120,
    byteSizeByType: [1, 1, 2, 2, 4, 4, 4, 2, 3, 4, 8],
    stringCache: {},
    stringiCache: {},
    unpackAlignment: 4,
    recordError: function recordError(errorCode) {
        if (!GL.lastError) {
            GL.lastError = errorCode
        }
    },
    getNewId: function(table) {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
            table[i] = null
        }
        return ret
    },
    MAX_TEMP_BUFFER_SIZE: 2097152,
    numTempVertexBuffersPerSize: 64,
    log2ceilLookup: function(i) {
        return 32 - Math.clz32(i === 0 ? 0 : i - 1)
    },
    generateTempBuffers: function(quads, context) {
        var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
        context.tempVertexBufferCounters1 = [];
        context.tempVertexBufferCounters2 = [];
        context.tempVertexBufferCounters1.length = context.tempVertexBufferCounters2.length = largestIndex + 1;
        context.tempVertexBuffers1 = [];
        context.tempVertexBuffers2 = [];
        context.tempVertexBuffers1.length = context.tempVertexBuffers2.length = largestIndex + 1;
        context.tempIndexBuffers = [];
        context.tempIndexBuffers.length = largestIndex + 1;
        for (var i = 0; i <= largestIndex; ++i) {
            context.tempIndexBuffers[i] = null;
            context.tempVertexBufferCounters1[i] = context.tempVertexBufferCounters2[i] = 0;
            var ringbufferLength = GL.numTempVertexBuffersPerSize;
            context.tempVertexBuffers1[i] = [];
            context.tempVertexBuffers2[i] = [];
            var ringbuffer1 = context.tempVertexBuffers1[i];
            var ringbuffer2 = context.tempVertexBuffers2[i];
            ringbuffer1.length = ringbuffer2.length = ringbufferLength;
            for (var j = 0; j < ringbufferLength; ++j) {
                ringbuffer1[j] = ringbuffer2[j] = null
            }
        }
        if (quads) {
            context.tempQuadIndexBuffer = GLctx.createBuffer();
            context.GLctx.bindBuffer(34963, context.tempQuadIndexBuffer);
            var numIndexes = GL.MAX_TEMP_BUFFER_SIZE >> 1;
            var quadIndexes = new Uint16Array(numIndexes);
            var i = 0
              , v = 0;
            while (1) {
                quadIndexes[i++] = v;
                if (i >= numIndexes)
                    break;
                quadIndexes[i++] = v + 1;
                if (i >= numIndexes)
                    break;
                quadIndexes[i++] = v + 2;
                if (i >= numIndexes)
                    break;
                quadIndexes[i++] = v;
                if (i >= numIndexes)
                    break;
                quadIndexes[i++] = v + 2;
                if (i >= numIndexes)
                    break;
                quadIndexes[i++] = v + 3;
                if (i >= numIndexes)
                    break;
                v += 4
            }
            context.GLctx.bufferData(34963, quadIndexes, 35044);
            context.GLctx.bindBuffer(34963, null)
        }
    },
    getTempVertexBuffer: function getTempVertexBuffer(sizeBytes) {
        var idx = GL.log2ceilLookup(sizeBytes);
        var ringbuffer = GL.currentContext.tempVertexBuffers1[idx];
        var nextFreeBufferIndex = GL.currentContext.tempVertexBufferCounters1[idx];
        GL.currentContext.tempVertexBufferCounters1[idx] = GL.currentContext.tempVertexBufferCounters1[idx] + 1 & GL.numTempVertexBuffersPerSize - 1;
        var vbo = ringbuffer[nextFreeBufferIndex];
        if (vbo) {
            return vbo
        }
        var prevVBO = GLctx.getParameter(34964);
        ringbuffer[nextFreeBufferIndex] = GLctx.createBuffer();
        GLctx.bindBuffer(34962, ringbuffer[nextFreeBufferIndex]);
        GLctx.bufferData(34962, 1 << idx, 35048);
        GLctx.bindBuffer(34962, prevVBO);
        return ringbuffer[nextFreeBufferIndex]
    },
    getTempIndexBuffer: function getTempIndexBuffer(sizeBytes) {
        var idx = GL.log2ceilLookup(sizeBytes);
        var ibo = GL.currentContext.tempIndexBuffers[idx];
        if (ibo) {
            return ibo
        }
        var prevIBO = GLctx.getParameter(34965);
        GL.currentContext.tempIndexBuffers[idx] = GLctx.createBuffer();
        GLctx.bindBuffer(34963, GL.currentContext.tempIndexBuffers[idx]);
        GLctx.bufferData(34963, 1 << idx, 35048);
        GLctx.bindBuffer(34963, prevIBO);
        return GL.currentContext.tempIndexBuffers[idx]
    },
    newRenderingFrameStarted: function newRenderingFrameStarted() {
        if (!GL.currentContext) {
            return
        }
        var vb = GL.currentContext.tempVertexBuffers1;
        GL.currentContext.tempVertexBuffers1 = GL.currentContext.tempVertexBuffers2;
        GL.currentContext.tempVertexBuffers2 = vb;
        vb = GL.currentContext.tempVertexBufferCounters1;
        GL.currentContext.tempVertexBufferCounters1 = GL.currentContext.tempVertexBufferCounters2;
        GL.currentContext.tempVertexBufferCounters2 = vb;
        var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
        for (var i = 0; i <= largestIndex; ++i) {
            GL.currentContext.tempVertexBufferCounters1[i] = 0
        }
    },
    getSource: function(shader, count, string, length) {
        var source = "";
        for (var i = 0; i < count; ++i) {
            var len = length ? HEAP32[length + i * 4 >> 2] : -1;
            source += UTF8ToString(HEAP32[string + i * 4 >> 2], len < 0 ? undefined : len)
        }
        return source
    },
    calcBufLength: function calcBufLength(size, type, stride, count) {
        if (stride > 0) {
            return count * stride
        }
        var typeSize = GL.byteSizeByType[type - GL.byteSizeByTypeRoot];
        return size * typeSize * count
    },
    usedTempBuffers: [],
    preDrawHandleClientVertexAttribBindings: function preDrawHandleClientVertexAttribBindings(count) {
        GL.resetBufferBinding = false;
        for (var i = 0; i < GL.currentContext.maxVertexAttribs; ++i) {
            var cb = GL.currentContext.clientBuffers[i];
            if (!cb.clientside || !cb.enabled)
                continue;
            GL.resetBufferBinding = true;
            var size = GL.calcBufLength(cb.size, cb.type, cb.stride, count);
            var buf = GL.getTempVertexBuffer(size);
            GLctx.bindBuffer(34962, buf);
            GLctx.bufferSubData(34962, 0, HEAPU8.subarray(cb.ptr, cb.ptr + size));
            cb.vertexAttribPointerAdaptor.call(GLctx, i, cb.size, cb.type, cb.normalized, cb.stride, 0)
        }
    },
    postDrawHandleClientVertexAttribBindings: function postDrawHandleClientVertexAttribBindings() {
        if (GL.resetBufferBinding) {
            GLctx.bindBuffer(34962, GL.buffers[GLctx.currentArrayBufferBinding])
        }
    },
    createContext: function(canvas, webGLContextAttributes) {
        if (!canvas.getContextSafariWebGL2Fixed) {
            canvas.getContextSafariWebGL2Fixed = canvas.getContext;
            canvas.getContext = function(ver, attrs) {
                var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
                return ver == "webgl" == gl instanceof WebGLRenderingContext ? gl : null
            }
        }
        var ctx = webGLContextAttributes.majorVersion > 1 ? canvas.getContext("webgl2", webGLContextAttributes) : canvas.getContext("webgl", webGLContextAttributes);
        if (!ctx)
            return 0;
        var handle = GL.registerContext(ctx, webGLContextAttributes);
        return handle
    },
    registerContext: function(ctx, webGLContextAttributes) {
        var handle = GL.getNewId(GL.contexts);
        var context = {
            handle: handle,
            attributes: webGLContextAttributes,
            version: webGLContextAttributes.majorVersion,
            GLctx: ctx
        };
        if (ctx.canvas)
            ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes.enableExtensionsByDefault === "undefined" || webGLContextAttributes.enableExtensionsByDefault) {
            GL.initExtensions(context)
        }
        context.maxVertexAttribs = context.GLctx.getParameter(34921);
        context.clientBuffers = [];
        for (var i = 0; i < context.maxVertexAttribs; i++) {
            context.clientBuffers[i] = {
                enabled: false,
                clientside: false,
                size: 0,
                type: 0,
                normalized: 0,
                stride: 0,
                ptr: 0,
                vertexAttribPointerAdaptor: null
            }
        }
        GL.generateTempBuffers(false, context);
        return handle
    },
    makeContextCurrent: function(contextHandle) {
        GL.currentContext = GL.contexts[contextHandle];
        Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx;
        return !(contextHandle && !GLctx)
    },
    getContext: function(contextHandle) {
        return GL.contexts[contextHandle]
    },
    deleteContext: function(contextHandle) {
        if (GL.currentContext === GL.contexts[contextHandle])
            GL.currentContext = null;
        if (typeof JSEvents === "object")
            JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
        if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas)
            GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
        GL.contexts[contextHandle] = null
    },
    initExtensions: function(context) {
        if (!context)
            context = GL.currentContext;
        if (context.initExtensionsDone)
            return;
        context.initExtensionsDone = true;
        var GLctx = context.GLctx;
        __webgl_enable_ANGLE_instanced_arrays(GLctx);
        __webgl_enable_OES_vertex_array_object(GLctx);
        __webgl_enable_WEBGL_draw_buffers(GLctx);
        __webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
        __webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);
        if (context.version >= 2) {
            GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query_webgl2")
        }
        if (context.version < 2 || !GLctx.disjointTimerQueryExt) {
            GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query")
        }
        __webgl_enable_WEBGL_multi_draw(GLctx);
        var exts = GLctx.getSupportedExtensions() || [];
        exts.forEach(function(ext) {
            if (!ext.includes("lose_context") && !ext.includes("debug")) {
                GLctx.getExtension(ext)
            }
        })
    }
};
var __emscripten_webgl_power_preferences = ["default", "low-power", "high-performance"];
function _emscripten_webgl_do_create_context(target, attributes) {
    var a = attributes >> 2;
    var powerPreference = HEAP32[a + (24 >> 2)];
    var contextAttributes = {
        "alpha": !!HEAP32[a + (0 >> 2)],
        "depth": !!HEAP32[a + (4 >> 2)],
        "stencil": !!HEAP32[a + (8 >> 2)],
        "antialias": !!HEAP32[a + (12 >> 2)],
        "premultipliedAlpha": !!HEAP32[a + (16 >> 2)],
        "preserveDrawingBuffer": !!HEAP32[a + (20 >> 2)],
        "powerPreference": __emscripten_webgl_power_preferences[powerPreference],
        "failIfMajorPerformanceCaveat": !!HEAP32[a + (28 >> 2)],
        majorVersion: HEAP32[a + (32 >> 2)],
        minorVersion: HEAP32[a + (36 >> 2)],
        enableExtensionsByDefault: HEAP32[a + (40 >> 2)],
        explicitSwapControl: HEAP32[a + (44 >> 2)],
        proxyContextToMainThread: HEAP32[a + (48 >> 2)],
        renderViaOffscreenBackBuffer: HEAP32[a + (52 >> 2)]
    };
    var canvas = findCanvasEventTarget(target);
    if (!canvas) {
        return 0
    }
    if (contextAttributes.explicitSwapControl) {
        return 0
    }
    var contextHandle = GL.createContext(canvas, contextAttributes);
    return contextHandle
}
function _emscripten_webgl_create_context(a0, a1) {
    return _emscripten_webgl_do_create_context(a0, a1)
}
function _emscripten_webgl_enable_extension(contextHandle, extension) {
    var context = GL.getContext(contextHandle);
    var extString = UTF8ToString(extension);
    if (extString.startsWith("GL_"))
        extString = extString.substr(3);
    if (extString == "ANGLE_instanced_arrays")
        __webgl_enable_ANGLE_instanced_arrays(GLctx);
    if (extString == "OES_vertex_array_object")
        __webgl_enable_OES_vertex_array_object(GLctx);
    if (extString == "WEBGL_draw_buffers")
        __webgl_enable_WEBGL_draw_buffers(GLctx);
    if (extString == "WEBGL_draw_instanced_base_vertex_base_instance")
        __webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
    if (extString == "WEBGL_multi_draw_instanced_base_vertex_base_instance")
        __webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);
    if (extString == "WEBGL_multi_draw")
        __webgl_enable_WEBGL_multi_draw(GLctx);
    var ext = context.GLctx.getExtension(extString);
    return !!ext
}
function _emscripten_webgl_init_context_attributes(attributes) {
    var a = attributes >> 2;
    for (var i = 0; i < 56 >> 2; ++i) {
        HEAP32[a + i] = 0
    }
    HEAP32[a + (0 >> 2)] = HEAP32[a + (4 >> 2)] = HEAP32[a + (12 >> 2)] = HEAP32[a + (16 >> 2)] = HEAP32[a + (32 >> 2)] = HEAP32[a + (40 >> 2)] = 1
}
function _emscripten_webgl_make_context_current(contextHandle) {
    var success = GL.makeContextCurrent(contextHandle);
    return success ? 0 : -5
}
var ENV = {};
function getExecutableName() {
    return thisProgram || "./this.program"
}
function getEnvStrings() {
    if (!getEnvStrings.strings) {
        var lang = (typeof navigator === "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
        var env = {
            "USER": "web_user",
            "LOGNAME": "web_user",
            "PATH": "/",
            "PWD": "/",
            "HOME": "/home/web_user",
            "LANG": lang,
            "_": getExecutableName()
        };
        for (var x in ENV) {
            env[x] = ENV[x]
        }
        var strings = [];
        for (var x in env) {
            strings.push(x + "=" + env[x])
        }
        getEnvStrings.strings = strings
    }
    return getEnvStrings.strings
}
function _environ_get(__environ, environ_buf) {
    try {
        var bufSize = 0;
        getEnvStrings().forEach(function(string, i) {
            var ptr = environ_buf + bufSize;
            HEAP32[__environ + i * 4 >> 2] = ptr;
            writeAsciiToMemory(string, ptr);
            bufSize += string.length + 1
        });
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return e.errno
    }
}
function _environ_sizes_get(penviron_count, penviron_buf_size) {
    try {
        var strings = getEnvStrings();
        HEAP32[penviron_count >> 2] = strings.length;
        var bufSize = 0;
        strings.forEach(function(string) {
            bufSize += string.length + 1
        });
        HEAP32[penviron_buf_size >> 2] = bufSize;
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return e.errno
    }
}
function _exit(status) {
    exit(status)
}
function _fd_close(fd) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return e.errno
    }
}
function _fd_read(fd, iov, iovcnt, pnum) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = SYSCALLS.doReadv(stream, iov, iovcnt);
        HEAP32[pnum >> 2] = num;
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return e.errno
    }
}
function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var HIGH_OFFSET = 4294967296;
        var offset = offset_high * HIGH_OFFSET + (offset_low >>> 0);
        var DOUBLE_LIMIT = 9007199254740992;
        if (offset <= -DOUBLE_LIMIT || offset >= DOUBLE_LIMIT) {
            return -61
        }
        FS.llseek(stream, offset, whence);
        tempI64 = [stream.position >>> 0, (tempDouble = stream.position,
        +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)],
        HEAP32[newOffset >> 2] = tempI64[0],
        HEAP32[newOffset + 4 >> 2] = tempI64[1];
        if (stream.getdents && offset === 0 && whence === 0)
            stream.getdents = null;
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return e.errno
    }
}
function _fd_write(fd, iov, iovcnt, pnum) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = SYSCALLS.doWritev(stream, iov, iovcnt);
        HEAP32[pnum >> 2] = num;
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return e.errno
    }
}
function _glActiveTexture(x0) {
    GLctx["activeTexture"](x0)
}
function _glAttachShader(program, shader) {
    GLctx.attachShader(GL.programs[program], GL.shaders[shader])
}
function _glBindBuffer(target, buffer) {
    if (target == 34962) {
        GLctx.currentArrayBufferBinding = buffer
    } else if (target == 34963) {
        GLctx.currentElementArrayBufferBinding = buffer
    }
    if (target == 35051) {
        GLctx.currentPixelPackBufferBinding = buffer
    } else if (target == 35052) {
        GLctx.currentPixelUnpackBufferBinding = buffer
    }
    GLctx.bindBuffer(target, GL.buffers[buffer])
}
function _glBindBufferBase(target, index, buffer) {
    GLctx["bindBufferBase"](target, index, GL.buffers[buffer])
}
function _glBindFramebuffer(target, framebuffer) {
    GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer])
}
function _glBindRenderbuffer(target, renderbuffer) {
    GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer])
}
function _glBindTexture(target, texture) {
    GLctx.bindTexture(target, GL.textures[texture])
}
function _glBindVertexArray(vao) {
    GLctx["bindVertexArray"](GL.vaos[vao]);
    var ibo = GLctx.getParameter(34965);
    GLctx.currentElementArrayBufferBinding = ibo ? ibo.name | 0 : 0
}
function _glBlendEquation(x0) {
    GLctx["blendEquation"](x0)
}
function _glBlendFunc(x0, x1) {
    GLctx["blendFunc"](x0, x1)
}
function _glBlitFramebuffer(x0, x1, x2, x3, x4, x5, x6, x7, x8, x9) {
    GLctx["blitFramebuffer"](x0, x1, x2, x3, x4, x5, x6, x7, x8, x9)
}
function _glBufferData(target, size, data, usage) {
    if (GL.currentContext.version >= 2) {
        if (data) {
            GLctx.bufferData(target, HEAPU8, usage, data, size)
        } else {
            GLctx.bufferData(target, size, usage)
        }
    } else {
        GLctx.bufferData(target, data ? HEAPU8.subarray(data, data + size) : size, usage)
    }
}
function _glClear(x0) {
    GLctx["clear"](x0)
}
function _glClearColor(x0, x1, x2, x3) {
    GLctx["clearColor"](x0, x1, x2, x3)
}
function _glColorMask(red, green, blue, alpha) {
    GLctx.colorMask(!!red, !!green, !!blue, !!alpha)
}
function _glCompileShader(shader) {
    GLctx.compileShader(GL.shaders[shader])
}
function _glCreateProgram() {
    var id = GL.getNewId(GL.programs);
    var program = GLctx.createProgram();
    program.name = id;
    program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
    program.uniformIdCounter = 1;
    GL.programs[id] = program;
    return id
}
function _glCreateShader(shaderType) {
    var id = GL.getNewId(GL.shaders);
    GL.shaders[id] = GLctx.createShader(shaderType);
    return id
}
function _glCullFace(x0) {
    GLctx["cullFace"](x0)
}
function _glDeleteBuffers(n, buffers) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[buffers + i * 4 >> 2];
        var buffer = GL.buffers[id];
        if (!buffer)
            continue;
        GLctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null;
        if (id == GLctx.currentArrayBufferBinding)
            GLctx.currentArrayBufferBinding = 0;
        if (id == GLctx.currentElementArrayBufferBinding)
            GLctx.currentElementArrayBufferBinding = 0;
        if (id == GLctx.currentPixelPackBufferBinding)
            GLctx.currentPixelPackBufferBinding = 0;
        if (id == GLctx.currentPixelUnpackBufferBinding)
            GLctx.currentPixelUnpackBufferBinding = 0
    }
}
function _glDeleteFramebuffers(n, framebuffers) {
    for (var i = 0; i < n; ++i) {
        var id = HEAP32[framebuffers + i * 4 >> 2];
        var framebuffer = GL.framebuffers[id];
        if (!framebuffer)
            continue;
        GLctx.deleteFramebuffer(framebuffer);
        framebuffer.name = 0;
        GL.framebuffers[id] = null
    }
}
function _glDeleteProgram(id) {
    if (!id)
        return;
    var program = GL.programs[id];
    if (!program) {
        GL.recordError(1281);
        return
    }
    GLctx.deleteProgram(program);
    program.name = 0;
    GL.programs[id] = null
}
function _glDeleteRenderbuffers(n, renderbuffers) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[renderbuffers + i * 4 >> 2];
        var renderbuffer = GL.renderbuffers[id];
        if (!renderbuffer)
            continue;
        GLctx.deleteRenderbuffer(renderbuffer);
        renderbuffer.name = 0;
        GL.renderbuffers[id] = null
    }
}
function _glDeleteShader(id) {
    if (!id)
        return;
    var shader = GL.shaders[id];
    if (!shader) {
        GL.recordError(1281);
        return
    }
    GLctx.deleteShader(shader);
    GL.shaders[id] = null
}
function _glDeleteTextures(n, textures) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[textures + i * 4 >> 2];
        var texture = GL.textures[id];
        if (!texture)
            continue;
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null
    }
}
function _glDeleteVertexArrays(n, vaos) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[vaos + i * 4 >> 2];
        GLctx["deleteVertexArray"](GL.vaos[id]);
        GL.vaos[id] = null
    }
}
function _glDepthFunc(x0) {
    GLctx["depthFunc"](x0)
}
function _glDepthMask(flag) {
    GLctx.depthMask(!!flag)
}
function _glDisable(x0) {
    GLctx["disable"](x0)
}
function _glDrawArrays(mode, first, count) {
    GL.preDrawHandleClientVertexAttribBindings(first + count);
    GLctx.drawArrays(mode, first, count);
    GL.postDrawHandleClientVertexAttribBindings()
}
var tempFixedLengthArray = [];
function _glDrawBuffers(n, bufs) {
    var bufArray = tempFixedLengthArray[n];
    for (var i = 0; i < n; i++) {
        bufArray[i] = HEAP32[bufs + i * 4 >> 2]
    }
    GLctx["drawBuffers"](bufArray)
}
function _glDrawElements(mode, count, type, indices) {
    var buf;
    if (!GLctx.currentElementArrayBufferBinding) {
        var size = GL.calcBufLength(1, type, 0, count);
        buf = GL.getTempIndexBuffer(size);
        GLctx.bindBuffer(34963, buf);
        GLctx.bufferSubData(34963, 0, HEAPU8.subarray(indices, indices + size));
        indices = 0
    }
    GL.preDrawHandleClientVertexAttribBindings(count);
    GLctx.drawElements(mode, count, type, indices);
    GL.postDrawHandleClientVertexAttribBindings(count);
    if (!GLctx.currentElementArrayBufferBinding) {
        GLctx.bindBuffer(34963, null)
    }
}
function _glEnable(x0) {
    GLctx["enable"](x0)
}
function _glEnableVertexAttribArray(index) {
    var cb = GL.currentContext.clientBuffers[index];
    cb.enabled = true;
    GLctx.enableVertexAttribArray(index)
}
function _glFlush() {
    GLctx["flush"]()
}
function _glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer) {
    GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget, GL.renderbuffers[renderbuffer])
}
function _glFramebufferTexture2D(target, attachment, textarget, texture, level) {
    GLctx.framebufferTexture2D(target, attachment, textarget, GL.textures[texture], level)
}
function _glFrontFace(x0) {
    GLctx["frontFace"](x0)
}
function __glGenObject(n, buffers, createFunction, objectTable) {
    for (var i = 0; i < n; i++) {
        var buffer = GLctx[createFunction]();
        var id = buffer && GL.getNewId(objectTable);
        if (buffer) {
            buffer.name = id;
            objectTable[id] = buffer
        } else {
            GL.recordError(1282)
        }
        HEAP32[buffers + i * 4 >> 2] = id
    }
}
function _glGenBuffers(n, buffers) {
    __glGenObject(n, buffers, "createBuffer", GL.buffers)
}
function _glGenFramebuffers(n, ids) {
    __glGenObject(n, ids, "createFramebuffer", GL.framebuffers)
}
function _glGenRenderbuffers(n, renderbuffers) {
    __glGenObject(n, renderbuffers, "createRenderbuffer", GL.renderbuffers)
}
function _glGenTextures(n, textures) {
    __glGenObject(n, textures, "createTexture", GL.textures)
}
function _glGenVertexArrays(n, arrays) {
    __glGenObject(n, arrays, "createVertexArray", GL.vaos)
}
function _glGenerateMipmap(x0) {
    GLctx["generateMipmap"](x0)
}
function _glGetError() {
    var error = GLctx.getError() || GL.lastError;
    GL.lastError = 0;
    return error
}
function writeI53ToI64(ptr, num) {
    HEAPU32[ptr >> 2] = num;
    HEAPU32[ptr + 4 >> 2] = (num - HEAPU32[ptr >> 2]) / 4294967296
}
function emscriptenWebGLGet(name_, p, type) {
    if (!p) {
        GL.recordError(1281);
        return
    }
    var ret = undefined;
    switch (name_) {
    case 36346:
        ret = 1;
        break;
    case 36344:
        if (type != 0 && type != 1) {
            GL.recordError(1280)
        }
        return;
    case 34814:
    case 36345:
        ret = 0;
        break;
    case 34466:
        var formats = GLctx.getParameter(34467);
        ret = formats ? formats.length : 0;
        break;
    case 33309:
        if (GL.currentContext.version < 2) {
            GL.recordError(1282);
            return
        }
        var exts = GLctx.getSupportedExtensions() || [];
        ret = 2 * exts.length;
        break;
    case 33307:
    case 33308:
        if (GL.currentContext.version < 2) {
            GL.recordError(1280);
            return
        }
        ret = name_ == 33307 ? 3 : 0;
        break
    }
    if (ret === undefined) {
        var result = GLctx.getParameter(name_);
        switch (typeof result) {
        case "number":
            ret = result;
            break;
        case "boolean":
            ret = result ? 1 : 0;
            break;
        case "string":
            GL.recordError(1280);
            return;
        case "object":
            if (result === null) {
                switch (name_) {
                case 34964:
                case 35725:
                case 34965:
                case 36006:
                case 36007:
                case 32873:
                case 34229:
                case 36662:
                case 36663:
                case 35053:
                case 35055:
                case 36010:
                case 35097:
                case 35869:
                case 32874:
                case 36389:
                case 35983:
                case 35368:
                case 34068:
                    {
                        ret = 0;
                        break
                    }
                default:
                    {
                        GL.recordError(1280);
                        return
                    }
                }
            } else if (result instanceof Float32Array || result instanceof Uint32Array || result instanceof Int32Array || result instanceof Array) {
                for (var i = 0; i < result.length; ++i) {
                    switch (type) {
                    case 0:
                        HEAP32[p + i * 4 >> 2] = result[i];
                        break;
                    case 2:
                        HEAPF32[p + i * 4 >> 2] = result[i];
                        break;
                    case 4:
                        HEAP8[p + i >> 0] = result[i] ? 1 : 0;
                        break
                    }
                }
                return
            } else {
                try {
                    ret = result.name | 0
                } catch (e) {
                    GL.recordError(1280);
                    err("GL_INVALID_ENUM in glGet" + type + "v: Unknown object returned from WebGL getParameter(" + name_ + ")! (error: " + e + ")");
                    return
                }
            }
            break;
        default:
            GL.recordError(1280);
            err("GL_INVALID_ENUM in glGet" + type + "v: Native code calling glGet" + type + "v(" + name_ + ") and it returns " + result + " of type " + typeof result + "!");
            return
        }
    }
    switch (type) {
    case 1:
        writeI53ToI64(p, ret);
        break;
    case 0:
        HEAP32[p >> 2] = ret;
        break;
    case 2:
        HEAPF32[p >> 2] = ret;
        break;
    case 4:
        HEAP8[p >> 0] = ret ? 1 : 0;
        break
    }
}
function _glGetFloatv(name_, p) {
    emscriptenWebGLGet(name_, p, 2)
}
function _glGetIntegerv(name_, p) {
    emscriptenWebGLGet(name_, p, 0)
}
function _glGetProgramInfoLog(program, maxLength, length, infoLog) {
    var log = GLctx.getProgramInfoLog(GL.programs[program]);
    if (log === null)
        log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length)
        HEAP32[length >> 2] = numBytesWrittenExclNull
}
function _glGetProgramiv(program, pname, p) {
    if (!p) {
        GL.recordError(1281);
        return
    }
    if (program >= GL.counter) {
        GL.recordError(1281);
        return
    }
    program = GL.programs[program];
    if (pname == 35716) {
        var log = GLctx.getProgramInfoLog(program);
        if (log === null)
            log = "(unknown error)";
        HEAP32[p >> 2] = log.length + 1
    } else if (pname == 35719) {
        if (!program.maxUniformLength) {
            for (var i = 0; i < GLctx.getProgramParameter(program, 35718); ++i) {
                program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length + 1)
            }
        }
        HEAP32[p >> 2] = program.maxUniformLength
    } else if (pname == 35722) {
        if (!program.maxAttributeLength) {
            for (var i = 0; i < GLctx.getProgramParameter(program, 35721); ++i) {
                program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length + 1)
            }
        }
        HEAP32[p >> 2] = program.maxAttributeLength
    } else if (pname == 35381) {
        if (!program.maxUniformBlockNameLength) {
            for (var i = 0; i < GLctx.getProgramParameter(program, 35382); ++i) {
                program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length + 1)
            }
        }
        HEAP32[p >> 2] = program.maxUniformBlockNameLength
    } else {
        HEAP32[p >> 2] = GLctx.getProgramParameter(program, pname)
    }
}
function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null)
        log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length)
        HEAP32[length >> 2] = numBytesWrittenExclNull
}
function _glGetShaderiv(shader, pname, p) {
    if (!p) {
        GL.recordError(1281);
        return
    }
    if (pname == 35716) {
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null)
            log = "(unknown error)";
        var logLength = log ? log.length + 1 : 0;
        HEAP32[p >> 2] = logLength
    } else if (pname == 35720) {
        var source = GLctx.getShaderSource(GL.shaders[shader]);
        var sourceLength = source ? source.length + 1 : 0;
        HEAP32[p >> 2] = sourceLength
    } else {
        HEAP32[p >> 2] = GLctx.getShaderParameter(GL.shaders[shader], pname)
    }
}
function stringToNewUTF8(jsString) {
    var length = lengthBytesUTF8(jsString) + 1;
    var cString = _malloc(length);
    stringToUTF8(jsString, cString, length);
    return cString
}
function _glGetString(name_) {
    var ret = GL.stringCache[name_];
    if (!ret) {
        switch (name_) {
        case 7939:
            var exts = GLctx.getSupportedExtensions() || [];
            exts = exts.concat(exts.map(function(e) {
                return "GL_" + e
            }));
            ret = stringToNewUTF8(exts.join(" "));
            break;
        case 7936:
        case 7937:
        case 37445:
        case 37446:
            var s = GLctx.getParameter(name_);
            if (!s) {
                GL.recordError(1280)
            }
            ret = s && stringToNewUTF8(s);
            break;
        case 7938:
            var glVersion = GLctx.getParameter(7938);
            if (GL.currentContext.version >= 2)
                glVersion = "OpenGL ES 3.0 (" + glVersion + ")";
            else {
                glVersion = "OpenGL ES 2.0 (" + glVersion + ")"
            }
            ret = stringToNewUTF8(glVersion);
            break;
        case 35724:
            var glslVersion = GLctx.getParameter(35724);
            var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
            var ver_num = glslVersion.match(ver_re);
            if (ver_num !== null) {
                if (ver_num[1].length == 3)
                    ver_num[1] = ver_num[1] + "0";
                glslVersion = "OpenGL ES GLSL ES " + ver_num[1] + " (" + glslVersion + ")"
            }
            ret = stringToNewUTF8(glslVersion);
            break;
        default:
            GL.recordError(1280)
        }
        GL.stringCache[name_] = ret
    }
    return ret
}
function _glGetUniformBlockIndex(program, uniformBlockName) {
    return GLctx["getUniformBlockIndex"](GL.programs[program], UTF8ToString(uniformBlockName))
}
function jstoi_q(str) {
    return parseInt(str)
}
function _glGetUniformLocation(program, name) {
    function getLeftBracePos(name) {
        return name.slice(-1) == "]" && name.lastIndexOf("[")
    }
    name = UTF8ToString(name);
    program = GL.programs[program];
    var uniformLocsById = program.uniformLocsById;
    var uniformSizeAndIdsByName = program.uniformSizeAndIdsByName;
    var i, j;
    var arrayIndex = 0;
    var uniformBaseName = name;
    var leftBrace = getLeftBracePos(name);
    if (!uniformLocsById) {
        program.uniformLocsById = uniformLocsById = {};
        program.uniformArrayNamesById = {};
        for (i = 0; i < GLctx.getProgramParameter(program, 35718); ++i) {
            var u = GLctx.getActiveUniform(program, i);
            var nm = u.name;
            var sz = u.size;
            var lb = getLeftBracePos(nm);
            var arrayName = lb > 0 ? nm.slice(0, lb) : nm;
            var id = program.uniformIdCounter;
            program.uniformIdCounter += sz;
            uniformSizeAndIdsByName[arrayName] = [sz, id];
            for (j = 0; j < sz; ++j) {
                uniformLocsById[id] = j;
                program.uniformArrayNamesById[id++] = arrayName
            }
        }
    }
    if (leftBrace > 0) {
        arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0;
        uniformBaseName = name.slice(0, leftBrace)
    }
    var sizeAndId = uniformSizeAndIdsByName[uniformBaseName];
    if (sizeAndId && arrayIndex < sizeAndId[0]) {
        arrayIndex += sizeAndId[1];
        if (uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name)) {
            return arrayIndex
        }
    }
    return -1
}
function _glLinkProgram(program) {
    program = GL.programs[program];
    GLctx.linkProgram(program);
    program.uniformLocsById = 0;
    program.uniformSizeAndIdsByName = {}
}
function emscriptenWebGLGetBufferBinding(target) {
    switch (target) {
    case 34962:
        target = 34964;
        break;
    case 34963:
        target = 34965;
        break;
    case 35051:
        target = 35053;
        break;
    case 35052:
        target = 35055;
        break;
    case 35982:
        target = 35983;
        break;
    case 36662:
        target = 36662;
        break;
    case 36663:
        target = 36663;
        break;
    case 35345:
        target = 35368;
        break
    }
    var buffer = GLctx.getParameter(target);
    if (buffer)
        return buffer.name | 0;
    else
        return 0
}
function emscriptenWebGLValidateMapBufferTarget(target) {
    switch (target) {
    case 34962:
    case 34963:
    case 36662:
    case 36663:
    case 35051:
    case 35052:
    case 35882:
    case 35982:
    case 35345:
        return true;
    default:
        return false
    }
}
function _glMapBufferRange(target, offset, length, access) {
    if (access != 26 && access != 10) {
        err("glMapBufferRange is only supported when access is MAP_WRITE|INVALIDATE_BUFFER");
        return 0
    }
    if (!emscriptenWebGLValidateMapBufferTarget(target)) {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glMapBufferRange");
        return 0
    }
    var mem = _malloc(length);
    if (!mem)
        return 0;
    GL.mappedBuffers[emscriptenWebGLGetBufferBinding(target)] = {
        offset: offset,
        length: length,
        mem: mem,
        access: access
    };
    return mem
}
function _glPolygonOffset(x0, x1) {
    GLctx["polygonOffset"](x0, x1)
}
function _glReadBuffer(x0) {
    GLctx["readBuffer"](x0)
}
function computeUnpackAlignedImageSize(width, height, sizePerPixel, alignment) {
    function roundedToNextMultipleOf(x, y) {
        return x + y - 1 & -y
    }
    var plainRowSize = width * sizePerPixel;
    var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
    return height * alignedRowSize
}
function __colorChannelsInGlTextureFormat(format) {
    var colorChannels = {
        5: 3,
        6: 4,
        8: 2,
        29502: 3,
        29504: 4,
        26917: 2,
        26918: 2,
        29846: 3,
        29847: 4
    };
    return colorChannels[format - 6402] || 1
}
function heapObjectForWebGLType(type) {
    type -= 5120;
    if (type == 0)
        return HEAP8;
    if (type == 1)
        return HEAPU8;
    if (type == 2)
        return HEAP16;
    if (type == 4)
        return HEAP32;
    if (type == 6)
        return HEAPF32;
    if (type == 5 || type == 28922 || type == 28520 || type == 30779 || type == 30782)
        return HEAPU32;
    return HEAPU16
}
function heapAccessShiftForWebGLHeap(heap) {
    return 31 - Math.clz32(heap.BYTES_PER_ELEMENT)
}
function emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) {
    var heap = heapObjectForWebGLType(type);
    var shift = heapAccessShiftForWebGLHeap(heap);
    var byteSize = 1 << shift;
    var sizePerPixel = __colorChannelsInGlTextureFormat(format) * byteSize;
    var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel, GL.unpackAlignment);
    return heap.subarray(pixels >> shift, pixels + bytes >> shift)
}
function _glReadPixels(x, y, width, height, format, type, pixels) {
    if (GL.currentContext.version >= 2) {
        if (GLctx.currentPixelPackBufferBinding) {
            GLctx.readPixels(x, y, width, height, format, type, pixels)
        } else {
            var heap = heapObjectForWebGLType(type);
            GLctx.readPixels(x, y, width, height, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap))
        }
        return
    }
    var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
    if (!pixelData) {
        GL.recordError(1280);
        return
    }
    GLctx.readPixels(x, y, width, height, format, type, pixelData)
}
function _glRenderbufferStorage(x0, x1, x2, x3) {
    GLctx["renderbufferStorage"](x0, x1, x2, x3)
}
function _glShaderSource(shader, count, string, length) {
    var source = GL.getSource(shader, count, string, length);
    GLctx.shaderSource(GL.shaders[shader], source)
}
function _glStencilFunc(x0, x1, x2) {
    GLctx["stencilFunc"](x0, x1, x2)
}
function _glStencilMask(x0) {
    GLctx["stencilMask"](x0)
}
function _glStencilOp(x0, x1, x2) {
    GLctx["stencilOp"](x0, x1, x2)
}
function _glStencilOpSeparate(x0, x1, x2, x3) {
    GLctx["stencilOpSeparate"](x0, x1, x2, x3)
}
function _glTexImage2D(target, level, internalFormat, width, height, border, format, type, pixels) {
    if (GL.currentContext.version >= 2) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels)
        } else if (pixels) {
            var heap = heapObjectForWebGLType(type);
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap))
        } else {
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, null)
        }
        return
    }
    GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null)
}
function _glTexParameterf(x0, x1, x2) {
    GLctx["texParameterf"](x0, x1, x2)
}
function _glTexParameterfv(target, pname, params) {
    var param = HEAPF32[params >> 2];
    GLctx.texParameterf(target, pname, param)
}
function _glTexParameteri(x0, x1, x2) {
    GLctx["texParameteri"](x0, x1, x2)
}
function _glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels) {
    if (GL.currentContext.version >= 2) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels)
        } else if (pixels) {
            var heap = heapObjectForWebGLType(type);
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap))
        } else {
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, null)
        }
        return
    }
    var pixelData = null;
    if (pixels)
        pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, 0);
    GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData)
}
function webglGetUniformLocation(location) {
    var p = GLctx.currentProgram;
    var webglLoc = p.uniformLocsById[location];
    if (webglLoc >= 0) {
        p.uniformLocsById[location] = webglLoc = GLctx.getUniformLocation(p, p.uniformArrayNamesById[location] + (webglLoc > 0 ? "[" + webglLoc + "]" : ""))
    }
    return webglLoc
}
function _glUniform1f(location, v0) {
    GLctx.uniform1f(webglGetUniformLocation(location), v0)
}
function _glUniform1i(location, v0) {
    GLctx.uniform1i(webglGetUniformLocation(location), v0)
}
function _glUniform2f(location, v0, v1) {
    GLctx.uniform2f(webglGetUniformLocation(location), v0, v1)
}
var miniTempWebGLFloatBuffers = [];
function _glUniform2fv(location, count, value) {
    if (GL.currentContext.version >= 2) {
        GLctx.uniform2fv(webglGetUniformLocation(location), HEAPF32, value >> 2, count * 2);
        return
    }
    if (count <= 144) {
        var view = miniTempWebGLFloatBuffers[2 * count - 1];
        for (var i = 0; i < 2 * count; i += 2) {
            view[i] = HEAPF32[value + 4 * i >> 2];
            view[i + 1] = HEAPF32[value + (4 * i + 4) >> 2]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 8 >> 2)
    }
    GLctx.uniform2fv(webglGetUniformLocation(location), view)
}
function _glUniform3fv(location, count, value) {
    if (GL.currentContext.version >= 2) {
        GLctx.uniform3fv(webglGetUniformLocation(location), HEAPF32, value >> 2, count * 3);
        return
    }
    if (count <= 96) {
        var view = miniTempWebGLFloatBuffers[3 * count - 1];
        for (var i = 0; i < 3 * count; i += 3) {
            view[i] = HEAPF32[value + 4 * i >> 2];
            view[i + 1] = HEAPF32[value + (4 * i + 4) >> 2];
            view[i + 2] = HEAPF32[value + (4 * i + 8) >> 2]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 12 >> 2)
    }
    GLctx.uniform3fv(webglGetUniformLocation(location), view)
}
function _glUniform4fv(location, count, value) {
    if (GL.currentContext.version >= 2) {
        GLctx.uniform4fv(webglGetUniformLocation(location), HEAPF32, value >> 2, count * 4);
        return
    }
    if (count <= 72) {
        var view = miniTempWebGLFloatBuffers[4 * count - 1];
        var heap = HEAPF32;
        value >>= 2;
        for (var i = 0; i < 4 * count; i += 4) {
            var dst = value + i;
            view[i] = heap[dst];
            view[i + 1] = heap[dst + 1];
            view[i + 2] = heap[dst + 2];
            view[i + 3] = heap[dst + 3]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 16 >> 2)
    }
    GLctx.uniform4fv(webglGetUniformLocation(location), view)
}
function _glUniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding) {
    program = GL.programs[program];
    GLctx["uniformBlockBinding"](program, uniformBlockIndex, uniformBlockBinding)
}
function _glUniformMatrix4fv(location, count, transpose, value) {
    if (GL.currentContext.version >= 2) {
        GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, HEAPF32, value >> 2, count * 16);
        return
    }
    if (count <= 18) {
        var view = miniTempWebGLFloatBuffers[16 * count - 1];
        var heap = HEAPF32;
        value >>= 2;
        for (var i = 0; i < 16 * count; i += 16) {
            var dst = value + i;
            view[i] = heap[dst];
            view[i + 1] = heap[dst + 1];
            view[i + 2] = heap[dst + 2];
            view[i + 3] = heap[dst + 3];
            view[i + 4] = heap[dst + 4];
            view[i + 5] = heap[dst + 5];
            view[i + 6] = heap[dst + 6];
            view[i + 7] = heap[dst + 7];
            view[i + 8] = heap[dst + 8];
            view[i + 9] = heap[dst + 9];
            view[i + 10] = heap[dst + 10];
            view[i + 11] = heap[dst + 11];
            view[i + 12] = heap[dst + 12];
            view[i + 13] = heap[dst + 13];
            view[i + 14] = heap[dst + 14];
            view[i + 15] = heap[dst + 15]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 64 >> 2)
    }
    GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, view)
}
function _glUnmapBuffer(target) {
    if (!emscriptenWebGLValidateMapBufferTarget(target)) {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glUnmapBuffer");
        return 0
    }
    var buffer = emscriptenWebGLGetBufferBinding(target);
    var mapping = GL.mappedBuffers[buffer];
    if (!mapping) {
        GL.recordError(1282);
        err("buffer was never mapped in glUnmapBuffer");
        return 0
    }
    GL.mappedBuffers[buffer] = null;
    if (!(mapping.access & 16))
        if (GL.currentContext.version >= 2) {
            GLctx.bufferSubData(target, mapping.offset, HEAPU8, mapping.mem, mapping.length)
        } else {
            GLctx.bufferSubData(target, mapping.offset, HEAPU8.subarray(mapping.mem, mapping.mem + mapping.length))
        }
    _free(mapping.mem);
    return 1
}
function _glUseProgram(program) {
    program = GL.programs[program];
    GLctx.useProgram(program);
    GLctx.currentProgram = program
}
function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
    var cb = GL.currentContext.clientBuffers[index];
    if (!GLctx.currentArrayBufferBinding) {
        cb.size = size;
        cb.type = type;
        cb.normalized = normalized;
        cb.stride = stride;
        cb.ptr = ptr;
        cb.clientside = true;
        cb.vertexAttribPointerAdaptor = function(index, size, type, normalized, stride, ptr) {
            this.vertexAttribPointer(index, size, type, normalized, stride, ptr)
        }
        ;
        return
    }
    cb.clientside = false;
    GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr)
}
function _glViewport(x0, x1, x2, x3) {
    GLctx["viewport"](x0, x1, x2, x3)
}
function __isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}
function __arraySum(array, index) {
    var sum = 0;
    for (var i = 0; i <= index; sum += array[i++]) {}
    return sum
}
var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function __addDays(date, days) {
    var newDate = new Date(date.getTime());
    while (days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
        if (days > daysInCurrentMonth - newDate.getDate()) {
            days -= daysInCurrentMonth - newDate.getDate() + 1;
            newDate.setDate(1);
            if (currentMonth < 11) {
                newDate.setMonth(currentMonth + 1)
            } else {
                newDate.setMonth(0);
                newDate.setFullYear(newDate.getFullYear() + 1)
            }
        } else {
            newDate.setDate(newDate.getDate() + days);
            return newDate
        }
    }
    return newDate
}
function _strftime(s, maxsize, format, tm) {
    var tm_zone = HEAP32[tm + 40 >> 2];
    var date = {
        tm_sec: HEAP32[tm >> 2],
        tm_min: HEAP32[tm + 4 >> 2],
        tm_hour: HEAP32[tm + 8 >> 2],
        tm_mday: HEAP32[tm + 12 >> 2],
        tm_mon: HEAP32[tm + 16 >> 2],
        tm_year: HEAP32[tm + 20 >> 2],
        tm_wday: HEAP32[tm + 24 >> 2],
        tm_yday: HEAP32[tm + 28 >> 2],
        tm_isdst: HEAP32[tm + 32 >> 2],
        tm_gmtoff: HEAP32[tm + 36 >> 2],
        tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
    };
    var pattern = UTF8ToString(format);
    var EXPANSION_RULES_1 = {
        "%c": "%a %b %d %H:%M:%S %Y",
        "%D": "%m/%d/%y",
        "%F": "%Y-%m-%d",
        "%h": "%b",
        "%r": "%I:%M:%S %p",
        "%R": "%H:%M",
        "%T": "%H:%M:%S",
        "%x": "%m/%d/%y",
        "%X": "%H:%M:%S",
        "%Ec": "%c",
        "%EC": "%C",
        "%Ex": "%m/%d/%y",
        "%EX": "%H:%M:%S",
        "%Ey": "%y",
        "%EY": "%Y",
        "%Od": "%d",
        "%Oe": "%e",
        "%OH": "%H",
        "%OI": "%I",
        "%Om": "%m",
        "%OM": "%M",
        "%OS": "%S",
        "%Ou": "%u",
        "%OU": "%U",
        "%OV": "%V",
        "%Ow": "%w",
        "%OW": "%W",
        "%Oy": "%y"
    };
    for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule,"g"), EXPANSION_RULES_1[rule])
    }
    var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    function leadingSomething(value, digits, character) {
        var str = typeof value === "number" ? value.toString() : value || "";
        while (str.length < digits) {
            str = character[0] + str
        }
        return str
    }
    function leadingNulls(value, digits) {
        return leadingSomething(value, digits, "0")
    }
    function compareByDay(date1, date2) {
        function sgn(value) {
            return value < 0 ? -1 : value > 0 ? 1 : 0
        }
        var compare;
        if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
            if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
                compare = sgn(date1.getDate() - date2.getDate())
            }
        }
        return compare
    }
    function getFirstWeekStartDate(janFourth) {
        switch (janFourth.getDay()) {
        case 0:
            return new Date(janFourth.getFullYear() - 1,11,29);
        case 1:
            return janFourth;
        case 2:
            return new Date(janFourth.getFullYear(),0,3);
        case 3:
            return new Date(janFourth.getFullYear(),0,2);
        case 4:
            return new Date(janFourth.getFullYear(),0,1);
        case 5:
            return new Date(janFourth.getFullYear() - 1,11,31);
        case 6:
            return new Date(janFourth.getFullYear() - 1,11,30)
        }
    }
    function getWeekBasedYear(date) {
        var thisDate = __addDays(new Date(date.tm_year + 1900,0,1), date.tm_yday);
        var janFourthThisYear = new Date(thisDate.getFullYear(),0,4);
        var janFourthNextYear = new Date(thisDate.getFullYear() + 1,0,4);
        var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
        var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
        if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
            if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
                return thisDate.getFullYear() + 1
            } else {
                return thisDate.getFullYear()
            }
        } else {
            return thisDate.getFullYear() - 1
        }
    }
    var EXPANSION_RULES_2 = {
        "%a": function(date) {
            return WEEKDAYS[date.tm_wday].substring(0, 3)
        },
        "%A": function(date) {
            return WEEKDAYS[date.tm_wday]
        },
        "%b": function(date) {
            return MONTHS[date.tm_mon].substring(0, 3)
        },
        "%B": function(date) {
            return MONTHS[date.tm_mon]
        },
        "%C": function(date) {
            var year = date.tm_year + 1900;
            return leadingNulls(year / 100 | 0, 2)
        },
        "%d": function(date) {
            return leadingNulls(date.tm_mday, 2)
        },
        "%e": function(date) {
            return leadingSomething(date.tm_mday, 2, " ")
        },
        "%g": function(date) {
            return getWeekBasedYear(date).toString().substring(2)
        },
        "%G": function(date) {
            return getWeekBasedYear(date)
        },
        "%H": function(date) {
            return leadingNulls(date.tm_hour, 2)
        },
        "%I": function(date) {
            var twelveHour = date.tm_hour;
            if (twelveHour == 0)
                twelveHour = 12;
            else if (twelveHour > 12)
                twelveHour -= 12;
            return leadingNulls(twelveHour, 2)
        },
        "%j": function(date) {
            return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3)
        },
        "%m": function(date) {
            return leadingNulls(date.tm_mon + 1, 2)
        },
        "%M": function(date) {
            return leadingNulls(date.tm_min, 2)
        },
        "%n": function() {
            return "\n"
        },
        "%p": function(date) {
            if (date.tm_hour >= 0 && date.tm_hour < 12) {
                return "AM"
            } else {
                return "PM"
            }
        },
        "%S": function(date) {
            return leadingNulls(date.tm_sec, 2)
        },
        "%t": function() {
            return "\t"
        },
        "%u": function(date) {
            return date.tm_wday || 7
        },
        "%U": function(date) {
            var janFirst = new Date(date.tm_year + 1900,0,1);
            var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
            var endDate = new Date(date.tm_year + 1900,date.tm_mon,date.tm_mday);
            if (compareByDay(firstSunday, endDate) < 0) {
                var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
                var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
                var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
                return leadingNulls(Math.ceil(days / 7), 2)
            }
            return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00"
        },
        "%V": function(date) {
            var janFourthThisYear = new Date(date.tm_year + 1900,0,4);
            var janFourthNextYear = new Date(date.tm_year + 1901,0,4);
            var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
            var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
            var endDate = __addDays(new Date(date.tm_year + 1900,0,1), date.tm_yday);
            if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
                return "53"
            }
            if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
                return "01"
            }
            var daysDifference;
            if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
                daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate()
            } else {
                daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate()
            }
            return leadingNulls(Math.ceil(daysDifference / 7), 2)
        },
        "%w": function(date) {
            return date.tm_wday
        },
        "%W": function(date) {
            var janFirst = new Date(date.tm_year,0,1);
            var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
            var endDate = new Date(date.tm_year + 1900,date.tm_mon,date.tm_mday);
            if (compareByDay(firstMonday, endDate) < 0) {
                var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
                var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
                var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
                return leadingNulls(Math.ceil(days / 7), 2)
            }
            return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00"
        },
        "%y": function(date) {
            return (date.tm_year + 1900).toString().substring(2)
        },
        "%Y": function(date) {
            return date.tm_year + 1900
        },
        "%z": function(date) {
            var off = date.tm_gmtoff;
            var ahead = off >= 0;
            off = Math.abs(off) / 60;
            off = off / 60 * 100 + off % 60;
            return (ahead ? "+" : "-") + String("0000" + off).slice(-4)
        },
        "%Z": function(date) {
            return date.tm_zone
        },
        "%%": function() {
            return "%"
        }
    };
    for (var rule in EXPANSION_RULES_2) {
        if (pattern.includes(rule)) {
            pattern = pattern.replace(new RegExp(rule,"g"), EXPANSION_RULES_2[rule](date))
        }
    }
    var bytes = intArrayFromString(pattern, false);
    if (bytes.length > maxsize) {
        return 0
    }
    writeArrayToMemory(bytes, s);
    return bytes.length - 1
}
function _strftime_l(s, maxsize, format, tm) {
    return _strftime(s, maxsize, format, tm)
}
var FSNode = function(parent, name, mode, rdev) {
    if (!parent) {
        parent = this
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev
};
var readMode = 292 | 73;
var writeMode = 146;
Object.defineProperties(FSNode.prototype, {
    read: {
        get: function() {
            return (this.mode & readMode) === readMode
        },
        set: function(val) {
            val ? this.mode |= readMode : this.mode &= ~readMode
        }
    },
    write: {
        get: function() {
            return (this.mode & writeMode) === writeMode
        },
        set: function(val) {
            val ? this.mode |= writeMode : this.mode &= ~writeMode
        }
    },
    isFolder: {
        get: function() {
            return FS.isDir(this.mode)
        }
    },
    isDevice: {
        get: function() {
            return FS.isChrdev(this.mode)
        }
    }
});
FS.FSNode = FSNode;
FS.staticInit();
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createDevice"] = FS.createDevice;
Module["FS_unlink"] = FS.unlink;
var GLctx;
for (var i = 0; i < 32; ++i)
    tempFixedLengthArray.push(new Array(i));
var miniTempWebGLFloatBuffersStorage = new Float32Array(288);
for (var i = 0; i < 288; ++i) {
    miniTempWebGLFloatBuffers[i] = miniTempWebGLFloatBuffersStorage.subarray(0, i + 1)
}
function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull)
        u8array.length = numBytesWritten;
    return u8array
}
var asmLibraryArg = {
    "O": ___cxa_allocate_exception,
    "b": ___cxa_atexit,
    "L": ___cxa_throw,
    "S": ___sys_fcntl64,
    "ra": ___sys_ioctl,
    "sa": ___sys_open,
    "P": _abort,
    "Ba": _emscripten_asm_const_int,
    "Ua": _emscripten_memcpy_big,
    "Va": _emscripten_resize_heap,
    "va": _emscripten_set_canvas_element_size,
    "wa": _emscripten_webgl_create_context,
    "B": _emscripten_webgl_enable_extension,
    "xa": _emscripten_webgl_init_context_attributes,
    "ua": _emscripten_webgl_make_context_current,
    "Xa": _environ_get,
    "pa": _environ_sizes_get,
    "ta": _exit,
    "R": _fd_close,
    "qa": _fd_read,
    "Ta": _fd_seek,
    "Q": _fd_write,
    "A": _glActiveTexture,
    "la": _glAttachShader,
    "a": _glBindBuffer,
    "W": _glBindBufferBase,
    "s": _glBindFramebuffer,
    "X": _glBindRenderbuffer,
    "p": _glBindTexture,
    "K": _glBindVertexArray,
    "$": _glBlendEquation,
    "aa": _glBlendFunc,
    "T": _glBlitFramebuffer,
    "c": _glBufferData,
    "f": _glClear,
    "N": _glClearColor,
    "ca": _glColorMask,
    "Pa": _glCompileShader,
    "Na": _glCreateProgram,
    "Ra": _glCreateShader,
    "Ha": _glCullFace,
    "j": _glDeleteBuffers,
    "C": _glDeleteFramebuffers,
    "ja": _glDeleteProgram,
    "w": _glDeleteRenderbuffers,
    "I": _glDeleteShader,
    "Da": _glDeleteTextures,
    "v": _glDeleteVertexArrays,
    "ga": _glDepthFunc,
    "fa": _glDepthMask,
    "q": _glDisable,
    "U": _glDrawArrays,
    "Ca": _glDrawBuffers,
    "H": _glDrawElements,
    "o": _glEnable,
    "k": _glEnableVertexAttribArray,
    "F": _glFlush,
    "x": _glFramebufferRenderbuffer,
    "h": _glFramebufferTexture2D,
    "ba": _glFrontFace,
    "g": _glGenBuffers,
    "D": _glGenFramebuffers,
    "z": _glGenRenderbuffers,
    "Ea": _glGenTextures,
    "u": _glGenVertexArrays,
    "M": _glGenerateMipmap,
    "Ia": _glGetError,
    "oa": _glGetFloatv,
    "ha": _glGetIntegerv,
    "La": _glGetProgramInfoLog,
    "ka": _glGetProgramiv,
    "Oa": _glGetShaderInfoLog,
    "ma": _glGetShaderiv,
    "G": _glGetString,
    "Ka": _glGetUniformBlockIndex,
    "ia": _glGetUniformLocation,
    "Ma": _glLinkProgram,
    "n": _glMapBufferRange,
    "_": _glPolygonOffset,
    "E": _glReadBuffer,
    "J": _glReadPixels,
    "y": _glRenderbufferStorage,
    "Qa": _glShaderSource,
    "ea": _glStencilFunc,
    "Ga": _glStencilMask,
    "da": _glStencilOp,
    "Z": _glStencilOpSeparate,
    "e": _glTexImage2D,
    "na": _glTexParameterf,
    "Fa": _glTexParameterfv,
    "d": _glTexParameteri,
    "Ya": _glTexSubImage2D,
    "V": _glUniform1f,
    "i": _glUniform1i,
    "Sa": _glUniform2f,
    "Aa": _glUniform2fv,
    "za": _glUniform3fv,
    "ya": _glUniform4fv,
    "Ja": _glUniformBlockBinding,
    "r": _glUniformMatrix4fv,
    "m": _glUnmapBuffer,
    "Y": _glUseProgram,
    "l": _glVertexAttribPointer,
    "t": _glViewport,
    "Wa": _strftime_l
};
var asm = createWasm();
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function() {
    return (___wasm_call_ctors = Module["___wasm_call_ctors"] = Module["asm"]["_a"]).apply(null, arguments)
}
;
var _fflush = Module["_fflush"] = function() {
    return (_fflush = Module["_fflush"] = Module["asm"]["ab"]).apply(null, arguments)
}
;
var _wr_spot_light_new = Module["_wr_spot_light_new"] = function() {
    return (_wr_spot_light_new = Module["_wr_spot_light_new"] = Module["asm"]["bb"]).apply(null, arguments)
}
;
var _wr_spot_light_set_color = Module["_wr_spot_light_set_color"] = function() {
    return (_wr_spot_light_set_color = Module["_wr_spot_light_set_color"] = Module["asm"]["cb"]).apply(null, arguments)
}
;
var _wr_spot_light_set_intensity = Module["_wr_spot_light_set_intensity"] = function() {
    return (_wr_spot_light_set_intensity = Module["_wr_spot_light_set_intensity"] = Module["asm"]["db"]).apply(null, arguments)
}
;
var _wr_spot_light_set_ambient_intensity = Module["_wr_spot_light_set_ambient_intensity"] = function() {
    return (_wr_spot_light_set_ambient_intensity = Module["_wr_spot_light_set_ambient_intensity"] = Module["asm"]["eb"]).apply(null, arguments)
}
;
var _wr_spot_light_set_on = Module["_wr_spot_light_set_on"] = function() {
    return (_wr_spot_light_set_on = Module["_wr_spot_light_set_on"] = Module["asm"]["fb"]).apply(null, arguments)
}
;
var _wr_spot_light_set_cast_shadows = Module["_wr_spot_light_set_cast_shadows"] = function() {
    return (_wr_spot_light_set_cast_shadows = Module["_wr_spot_light_set_cast_shadows"] = Module["asm"]["gb"]).apply(null, arguments)
}
;
var _wr_spot_light_set_attenuation = Module["_wr_spot_light_set_attenuation"] = function() {
    return (_wr_spot_light_set_attenuation = Module["_wr_spot_light_set_attenuation"] = Module["asm"]["hb"]).apply(null, arguments)
}
;
var _wr_spot_light_set_position_relative = Module["_wr_spot_light_set_position_relative"] = function() {
    return (_wr_spot_light_set_position_relative = Module["_wr_spot_light_set_position_relative"] = Module["asm"]["ib"]).apply(null, arguments)
}
;
var _wr_spot_light_set_radius = Module["_wr_spot_light_set_radius"] = function() {
    return (_wr_spot_light_set_radius = Module["_wr_spot_light_set_radius"] = Module["asm"]["jb"]).apply(null, arguments)
}
;
var _wr_spot_light_set_direction = Module["_wr_spot_light_set_direction"] = function() {
    return (_wr_spot_light_set_direction = Module["_wr_spot_light_set_direction"] = Module["asm"]["kb"]).apply(null, arguments)
}
;
var _wr_spot_light_set_beam_width = Module["_wr_spot_light_set_beam_width"] = function() {
    return (_wr_spot_light_set_beam_width = Module["_wr_spot_light_set_beam_width"] = Module["asm"]["lb"]).apply(null, arguments)
}
;
var _wr_spot_light_set_cutoff_angle = Module["_wr_spot_light_set_cutoff_angle"] = function() {
    return (_wr_spot_light_set_cutoff_angle = Module["_wr_spot_light_set_cutoff_angle"] = Module["asm"]["mb"]).apply(null, arguments)
}
;
var _wr_point_light_new = Module["_wr_point_light_new"] = function() {
    return (_wr_point_light_new = Module["_wr_point_light_new"] = Module["asm"]["nb"]).apply(null, arguments)
}
;
var _wr_point_light_set_color = Module["_wr_point_light_set_color"] = function() {
    return (_wr_point_light_set_color = Module["_wr_point_light_set_color"] = Module["asm"]["ob"]).apply(null, arguments)
}
;
var _wr_point_light_set_intensity = Module["_wr_point_light_set_intensity"] = function() {
    return (_wr_point_light_set_intensity = Module["_wr_point_light_set_intensity"] = Module["asm"]["pb"]).apply(null, arguments)
}
;
var _wr_point_light_set_ambient_intensity = Module["_wr_point_light_set_ambient_intensity"] = function() {
    return (_wr_point_light_set_ambient_intensity = Module["_wr_point_light_set_ambient_intensity"] = Module["asm"]["qb"]).apply(null, arguments)
}
;
var _wr_point_light_set_on = Module["_wr_point_light_set_on"] = function() {
    return (_wr_point_light_set_on = Module["_wr_point_light_set_on"] = Module["asm"]["rb"]).apply(null, arguments)
}
;
var _wr_point_light_set_cast_shadows = Module["_wr_point_light_set_cast_shadows"] = function() {
    return (_wr_point_light_set_cast_shadows = Module["_wr_point_light_set_cast_shadows"] = Module["asm"]["sb"]).apply(null, arguments)
}
;
var _wr_point_light_set_position_relative = Module["_wr_point_light_set_position_relative"] = function() {
    return (_wr_point_light_set_position_relative = Module["_wr_point_light_set_position_relative"] = Module["asm"]["tb"]).apply(null, arguments)
}
;
var _wr_point_light_set_radius = Module["_wr_point_light_set_radius"] = function() {
    return (_wr_point_light_set_radius = Module["_wr_point_light_set_radius"] = Module["asm"]["ub"]).apply(null, arguments)
}
;
var _wr_point_light_set_attenuation = Module["_wr_point_light_set_attenuation"] = function() {
    return (_wr_point_light_set_attenuation = Module["_wr_point_light_set_attenuation"] = Module["asm"]["vb"]).apply(null, arguments)
}
;
var _wr_skeleton_new = Module["_wr_skeleton_new"] = function() {
    return (_wr_skeleton_new = Module["_wr_skeleton_new"] = Module["asm"]["wb"]).apply(null, arguments)
}
;
var _wr_skeleton_get_bone_count = Module["_wr_skeleton_get_bone_count"] = function() {
    return (_wr_skeleton_get_bone_count = Module["_wr_skeleton_get_bone_count"] = Module["asm"]["xb"]).apply(null, arguments)
}
;
var _wr_skeleton_get_bone_by_index = Module["_wr_skeleton_get_bone_by_index"] = function() {
    return (_wr_skeleton_get_bone_by_index = Module["_wr_skeleton_get_bone_by_index"] = Module["asm"]["yb"]).apply(null, arguments)
}
;
var _wr_skeleton_get_bone_by_name = Module["_wr_skeleton_get_bone_by_name"] = function() {
    return (_wr_skeleton_get_bone_by_name = Module["_wr_skeleton_get_bone_by_name"] = Module["asm"]["zb"]).apply(null, arguments)
}
;
var _wr_skeleton_apply_binding_pose = Module["_wr_skeleton_apply_binding_pose"] = function() {
    return (_wr_skeleton_apply_binding_pose = Module["_wr_skeleton_apply_binding_pose"] = Module["asm"]["Ab"]).apply(null, arguments)
}
;
var _wr_skeleton_update_offset = Module["_wr_skeleton_update_offset"] = function() {
    return (_wr_skeleton_update_offset = Module["_wr_skeleton_update_offset"] = Module["asm"]["Bb"]).apply(null, arguments)
}
;
var _wr_static_mesh_unit_box_new = Module["_wr_static_mesh_unit_box_new"] = function() {
    return (_wr_static_mesh_unit_box_new = Module["_wr_static_mesh_unit_box_new"] = Module["asm"]["Cb"]).apply(null, arguments)
}
;
var _wr_static_mesh_unit_cone_new = Module["_wr_static_mesh_unit_cone_new"] = function() {
    return (_wr_static_mesh_unit_cone_new = Module["_wr_static_mesh_unit_cone_new"] = Module["asm"]["Db"]).apply(null, arguments)
}
;
var _wr_static_mesh_unit_cylinder_new = Module["_wr_static_mesh_unit_cylinder_new"] = function() {
    return (_wr_static_mesh_unit_cylinder_new = Module["_wr_static_mesh_unit_cylinder_new"] = Module["asm"]["Eb"]).apply(null, arguments)
}
;
var _wr_static_mesh_unit_elevation_grid_new = Module["_wr_static_mesh_unit_elevation_grid_new"] = function() {
    return (_wr_static_mesh_unit_elevation_grid_new = Module["_wr_static_mesh_unit_elevation_grid_new"] = Module["asm"]["Fb"]).apply(null, arguments)
}
;
var _wr_static_mesh_unit_rectangle_new = Module["_wr_static_mesh_unit_rectangle_new"] = function() {
    return (_wr_static_mesh_unit_rectangle_new = Module["_wr_static_mesh_unit_rectangle_new"] = Module["asm"]["Gb"]).apply(null, arguments)
}
;
var _wr_static_mesh_quad_new = Module["_wr_static_mesh_quad_new"] = function() {
    return (_wr_static_mesh_quad_new = Module["_wr_static_mesh_quad_new"] = Module["asm"]["Hb"]).apply(null, arguments)
}
;
var _wr_static_mesh_unit_sphere_new = Module["_wr_static_mesh_unit_sphere_new"] = function() {
    return (_wr_static_mesh_unit_sphere_new = Module["_wr_static_mesh_unit_sphere_new"] = Module["asm"]["Ib"]).apply(null, arguments)
}
;
var _wr_static_mesh_capsule_new = Module["_wr_static_mesh_capsule_new"] = function() {
    return (_wr_static_mesh_capsule_new = Module["_wr_static_mesh_capsule_new"] = Module["asm"]["Jb"]).apply(null, arguments)
}
;
var _wr_static_mesh_line_set_new = Module["_wr_static_mesh_line_set_new"] = function() {
    return (_wr_static_mesh_line_set_new = Module["_wr_static_mesh_line_set_new"] = Module["asm"]["Kb"]).apply(null, arguments)
}
;
var _wr_static_mesh_point_set_new = Module["_wr_static_mesh_point_set_new"] = function() {
    return (_wr_static_mesh_point_set_new = Module["_wr_static_mesh_point_set_new"] = Module["asm"]["Lb"]).apply(null, arguments)
}
;
var _wr_static_mesh_new = Module["_wr_static_mesh_new"] = function() {
    return (_wr_static_mesh_new = Module["_wr_static_mesh_new"] = Module["asm"]["Mb"]).apply(null, arguments)
}
;
var _wr_static_mesh_delete = Module["_wr_static_mesh_delete"] = function() {
    return (_wr_static_mesh_delete = Module["_wr_static_mesh_delete"] = Module["asm"]["Nb"]).apply(null, arguments)
}
;
var _wr_static_mesh_get_bounding_sphere = Module["_wr_static_mesh_get_bounding_sphere"] = function() {
    return (_wr_static_mesh_get_bounding_sphere = Module["_wr_static_mesh_get_bounding_sphere"] = Module["asm"]["Ob"]).apply(null, arguments)
}
;
var _wr_static_mesh_read_data = Module["_wr_static_mesh_read_data"] = function() {
    return (_wr_static_mesh_read_data = Module["_wr_static_mesh_read_data"] = Module["asm"]["Pb"]).apply(null, arguments)
}
;
var _wr_static_mesh_get_vertex_count = Module["_wr_static_mesh_get_vertex_count"] = function() {
    return (_wr_static_mesh_get_vertex_count = Module["_wr_static_mesh_get_vertex_count"] = Module["asm"]["Qb"]).apply(null, arguments)
}
;
var _wr_static_mesh_get_index_count = Module["_wr_static_mesh_get_index_count"] = function() {
    return (_wr_static_mesh_get_index_count = Module["_wr_static_mesh_get_index_count"] = Module["asm"]["Rb"]).apply(null, arguments)
}
;
var _wr_node_delete = Module["_wr_node_delete"] = function() {
    return (_wr_node_delete = Module["_wr_node_delete"] = Module["asm"]["Sb"]).apply(null, arguments)
}
;
var _wr_node_get_parent = Module["_wr_node_get_parent"] = function() {
    return (_wr_node_get_parent = Module["_wr_node_get_parent"] = Module["asm"]["Tb"]).apply(null, arguments)
}
;
var _wr_node_set_visible = Module["_wr_node_set_visible"] = function() {
    return (_wr_node_set_visible = Module["_wr_node_set_visible"] = Module["asm"]["Ub"]).apply(null, arguments)
}
;
var _wr_node_is_visible = Module["_wr_node_is_visible"] = function() {
    return (_wr_node_is_visible = Module["_wr_node_is_visible"] = Module["asm"]["Vb"]).apply(null, arguments)
}
;
var _wr_material_delete = Module["_wr_material_delete"] = function() {
    return (_wr_material_delete = Module["_wr_material_delete"] = Module["asm"]["Wb"]).apply(null, arguments)
}
;
var _wr_material_set_texture = Module["_wr_material_set_texture"] = function() {
    return (_wr_material_set_texture = Module["_wr_material_set_texture"] = Module["asm"]["Xb"]).apply(null, arguments)
}
;
var _wr_material_set_texture_wrap_s = Module["_wr_material_set_texture_wrap_s"] = function() {
    return (_wr_material_set_texture_wrap_s = Module["_wr_material_set_texture_wrap_s"] = Module["asm"]["Yb"]).apply(null, arguments)
}
;
var _wr_material_set_texture_wrap_t = Module["_wr_material_set_texture_wrap_t"] = function() {
    return (_wr_material_set_texture_wrap_t = Module["_wr_material_set_texture_wrap_t"] = Module["asm"]["Zb"]).apply(null, arguments)
}
;
var _wr_material_set_texture_anisotropy = Module["_wr_material_set_texture_anisotropy"] = function() {
    return (_wr_material_set_texture_anisotropy = Module["_wr_material_set_texture_anisotropy"] = Module["asm"]["_b"]).apply(null, arguments)
}
;
var _wr_material_set_texture_enable_interpolation = Module["_wr_material_set_texture_enable_interpolation"] = function() {
    return (_wr_material_set_texture_enable_interpolation = Module["_wr_material_set_texture_enable_interpolation"] = Module["asm"]["$b"]).apply(null, arguments)
}
;
var _wr_material_set_texture_enable_mip_maps = Module["_wr_material_set_texture_enable_mip_maps"] = function() {
    return (_wr_material_set_texture_enable_mip_maps = Module["_wr_material_set_texture_enable_mip_maps"] = Module["asm"]["ac"]).apply(null, arguments)
}
;
var _wr_material_set_texture_cubemap = Module["_wr_material_set_texture_cubemap"] = function() {
    return (_wr_material_set_texture_cubemap = Module["_wr_material_set_texture_cubemap"] = Module["asm"]["bc"]).apply(null, arguments)
}
;
var _wr_material_set_texture_cubemap_wrap_r = Module["_wr_material_set_texture_cubemap_wrap_r"] = function() {
    return (_wr_material_set_texture_cubemap_wrap_r = Module["_wr_material_set_texture_cubemap_wrap_r"] = Module["asm"]["cc"]).apply(null, arguments)
}
;
var _wr_material_set_texture_cubemap_wrap_s = Module["_wr_material_set_texture_cubemap_wrap_s"] = function() {
    return (_wr_material_set_texture_cubemap_wrap_s = Module["_wr_material_set_texture_cubemap_wrap_s"] = Module["asm"]["dc"]).apply(null, arguments)
}
;
var _wr_material_set_texture_cubemap_wrap_t = Module["_wr_material_set_texture_cubemap_wrap_t"] = function() {
    return (_wr_material_set_texture_cubemap_wrap_t = Module["_wr_material_set_texture_cubemap_wrap_t"] = Module["asm"]["ec"]).apply(null, arguments)
}
;
var _wr_material_set_texture_cubemap_anisotropy = Module["_wr_material_set_texture_cubemap_anisotropy"] = function() {
    return (_wr_material_set_texture_cubemap_anisotropy = Module["_wr_material_set_texture_cubemap_anisotropy"] = Module["asm"]["fc"]).apply(null, arguments)
}
;
var _wr_material_set_texture_cubemap_enable_interpolation = Module["_wr_material_set_texture_cubemap_enable_interpolation"] = function() {
    return (_wr_material_set_texture_cubemap_enable_interpolation = Module["_wr_material_set_texture_cubemap_enable_interpolation"] = Module["asm"]["gc"]).apply(null, arguments)
}
;
var _wr_material_set_texture_cubemap_enable_mip_maps = Module["_wr_material_set_texture_cubemap_enable_mip_maps"] = function() {
    return (_wr_material_set_texture_cubemap_enable_mip_maps = Module["_wr_material_set_texture_cubemap_enable_mip_maps"] = Module["asm"]["hc"]).apply(null, arguments)
}
;
var _wr_material_set_texture_transform = Module["_wr_material_set_texture_transform"] = function() {
    return (_wr_material_set_texture_transform = Module["_wr_material_set_texture_transform"] = Module["asm"]["ic"]).apply(null, arguments)
}
;
var _wr_material_set_default_program = Module["_wr_material_set_default_program"] = function() {
    return (_wr_material_set_default_program = Module["_wr_material_set_default_program"] = Module["asm"]["jc"]).apply(null, arguments)
}
;
var _wr_material_set_stencil_ambient_emissive_program = Module["_wr_material_set_stencil_ambient_emissive_program"] = function() {
    return (_wr_material_set_stencil_ambient_emissive_program = Module["_wr_material_set_stencil_ambient_emissive_program"] = Module["asm"]["kc"]).apply(null, arguments)
}
;
var _wr_material_set_stencil_diffuse_specular_program = Module["_wr_material_set_stencil_diffuse_specular_program"] = function() {
    return (_wr_material_set_stencil_diffuse_specular_program = Module["_wr_material_set_stencil_diffuse_specular_program"] = Module["asm"]["lc"]).apply(null, arguments)
}
;
var _wr_material_get_texture = Module["_wr_material_get_texture"] = function() {
    return (_wr_material_get_texture = Module["_wr_material_get_texture"] = Module["asm"]["mc"]).apply(null, arguments)
}
;
var _wr_material_get_texture_wrap_s = Module["_wr_material_get_texture_wrap_s"] = function() {
    return (_wr_material_get_texture_wrap_s = Module["_wr_material_get_texture_wrap_s"] = Module["asm"]["nc"]).apply(null, arguments)
}
;
var _wr_material_get_texture_wrap_t = Module["_wr_material_get_texture_wrap_t"] = function() {
    return (_wr_material_get_texture_wrap_t = Module["_wr_material_get_texture_wrap_t"] = Module["asm"]["oc"]).apply(null, arguments)
}
;
var _wr_material_get_texture_anisotropy = Module["_wr_material_get_texture_anisotropy"] = function() {
    return (_wr_material_get_texture_anisotropy = Module["_wr_material_get_texture_anisotropy"] = Module["asm"]["pc"]).apply(null, arguments)
}
;
var _wr_material_is_texture_interpolation_enabled = Module["_wr_material_is_texture_interpolation_enabled"] = function() {
    return (_wr_material_is_texture_interpolation_enabled = Module["_wr_material_is_texture_interpolation_enabled"] = Module["asm"]["qc"]).apply(null, arguments)
}
;
var _wr_material_are_texture_mip_maps_enabled = Module["_wr_material_are_texture_mip_maps_enabled"] = function() {
    return (_wr_material_are_texture_mip_maps_enabled = Module["_wr_material_are_texture_mip_maps_enabled"] = Module["asm"]["rc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_new = Module["_wr_post_processing_effect_pass_new"] = function() {
    return (_wr_post_processing_effect_pass_new = Module["_wr_post_processing_effect_pass_new"] = Module["asm"]["sc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_delete = Module["_wr_post_processing_effect_pass_delete"] = function() {
    return (_wr_post_processing_effect_pass_delete = Module["_wr_post_processing_effect_pass_delete"] = Module["asm"]["tc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_name = Module["_wr_post_processing_effect_pass_set_name"] = function() {
    return (_wr_post_processing_effect_pass_set_name = Module["_wr_post_processing_effect_pass_set_name"] = Module["asm"]["uc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_program = Module["_wr_post_processing_effect_pass_set_program"] = function() {
    return (_wr_post_processing_effect_pass_set_program = Module["_wr_post_processing_effect_pass_set_program"] = Module["asm"]["vc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_program_parameter = Module["_wr_post_processing_effect_pass_set_program_parameter"] = function() {
    return (_wr_post_processing_effect_pass_set_program_parameter = Module["_wr_post_processing_effect_pass_set_program_parameter"] = Module["asm"]["wc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_output_size = Module["_wr_post_processing_effect_pass_set_output_size"] = function() {
    return (_wr_post_processing_effect_pass_set_output_size = Module["_wr_post_processing_effect_pass_set_output_size"] = Module["asm"]["xc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_input_texture_count = Module["_wr_post_processing_effect_pass_set_input_texture_count"] = function() {
    return (_wr_post_processing_effect_pass_set_input_texture_count = Module["_wr_post_processing_effect_pass_set_input_texture_count"] = Module["asm"]["yc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_output_texture_count = Module["_wr_post_processing_effect_pass_set_output_texture_count"] = function() {
    return (_wr_post_processing_effect_pass_set_output_texture_count = Module["_wr_post_processing_effect_pass_set_output_texture_count"] = Module["asm"]["zc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_input_texture_wrap_mode = Module["_wr_post_processing_effect_pass_set_input_texture_wrap_mode"] = function() {
    return (_wr_post_processing_effect_pass_set_input_texture_wrap_mode = Module["_wr_post_processing_effect_pass_set_input_texture_wrap_mode"] = Module["asm"]["Ac"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_input_texture_interpolation = Module["_wr_post_processing_effect_pass_set_input_texture_interpolation"] = function() {
    return (_wr_post_processing_effect_pass_set_input_texture_interpolation = Module["_wr_post_processing_effect_pass_set_input_texture_interpolation"] = Module["asm"]["Bc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_output_texture_format = Module["_wr_post_processing_effect_pass_set_output_texture_format"] = function() {
    return (_wr_post_processing_effect_pass_set_output_texture_format = Module["_wr_post_processing_effect_pass_set_output_texture_format"] = Module["asm"]["Cc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_input_texture = Module["_wr_post_processing_effect_pass_set_input_texture"] = function() {
    return (_wr_post_processing_effect_pass_set_input_texture = Module["_wr_post_processing_effect_pass_set_input_texture"] = Module["asm"]["Dc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_iteration_count = Module["_wr_post_processing_effect_pass_set_iteration_count"] = function() {
    return (_wr_post_processing_effect_pass_set_iteration_count = Module["_wr_post_processing_effect_pass_set_iteration_count"] = Module["asm"]["Ec"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_get_output_texture = Module["_wr_post_processing_effect_pass_get_output_texture"] = function() {
    return (_wr_post_processing_effect_pass_get_output_texture = Module["_wr_post_processing_effect_pass_get_output_texture"] = Module["asm"]["Fc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_clear_before_draw = Module["_wr_post_processing_effect_pass_set_clear_before_draw"] = function() {
    return (_wr_post_processing_effect_pass_set_clear_before_draw = Module["_wr_post_processing_effect_pass_set_clear_before_draw"] = Module["asm"]["Gc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_pass_set_alpha_blending = Module["_wr_post_processing_effect_pass_set_alpha_blending"] = function() {
    return (_wr_post_processing_effect_pass_set_alpha_blending = Module["_wr_post_processing_effect_pass_set_alpha_blending"] = Module["asm"]["Hc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_new = Module["_wr_post_processing_effect_new"] = function() {
    return (_wr_post_processing_effect_new = Module["_wr_post_processing_effect_new"] = Module["asm"]["Ic"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_delete = Module["_wr_post_processing_effect_delete"] = function() {
    return (_wr_post_processing_effect_delete = Module["_wr_post_processing_effect_delete"] = Module["asm"]["Jc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_append_pass = Module["_wr_post_processing_effect_append_pass"] = function() {
    return (_wr_post_processing_effect_append_pass = Module["_wr_post_processing_effect_append_pass"] = Module["asm"]["Kc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_connect = Module["_wr_post_processing_effect_connect"] = function() {
    return (_wr_post_processing_effect_connect = Module["_wr_post_processing_effect_connect"] = Module["asm"]["Lc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_set_input_frame_buffer = Module["_wr_post_processing_effect_set_input_frame_buffer"] = function() {
    return (_wr_post_processing_effect_set_input_frame_buffer = Module["_wr_post_processing_effect_set_input_frame_buffer"] = Module["asm"]["Mc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_set_result_program = Module["_wr_post_processing_effect_set_result_program"] = function() {
    return (_wr_post_processing_effect_set_result_program = Module["_wr_post_processing_effect_set_result_program"] = Module["asm"]["Nc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_set_result_frame_buffer = Module["_wr_post_processing_effect_set_result_frame_buffer"] = function() {
    return (_wr_post_processing_effect_set_result_frame_buffer = Module["_wr_post_processing_effect_set_result_frame_buffer"] = Module["asm"]["Oc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_get_first_pass = Module["_wr_post_processing_effect_get_first_pass"] = function() {
    return (_wr_post_processing_effect_get_first_pass = Module["_wr_post_processing_effect_get_first_pass"] = Module["asm"]["Pc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_get_last_pass = Module["_wr_post_processing_effect_get_last_pass"] = function() {
    return (_wr_post_processing_effect_get_last_pass = Module["_wr_post_processing_effect_get_last_pass"] = Module["asm"]["Qc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_get_pass = Module["_wr_post_processing_effect_get_pass"] = function() {
    return (_wr_post_processing_effect_get_pass = Module["_wr_post_processing_effect_get_pass"] = Module["asm"]["Rc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_set_drawing_index = Module["_wr_post_processing_effect_set_drawing_index"] = function() {
    return (_wr_post_processing_effect_set_drawing_index = Module["_wr_post_processing_effect_set_drawing_index"] = Module["asm"]["Sc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_setup = Module["_wr_post_processing_effect_setup"] = function() {
    return (_wr_post_processing_effect_setup = Module["_wr_post_processing_effect_setup"] = Module["asm"]["Tc"]).apply(null, arguments)
}
;
var _wr_post_processing_effect_apply = Module["_wr_post_processing_effect_apply"] = function() {
    return (_wr_post_processing_effect_apply = Module["_wr_post_processing_effect_apply"] = Module["asm"]["Uc"]).apply(null, arguments)
}
;
var _wr_skeleton_bone_get_name = Module["_wr_skeleton_bone_get_name"] = function() {
    return (_wr_skeleton_bone_get_name = Module["_wr_skeleton_bone_get_name"] = Module["asm"]["Vc"]).apply(null, arguments)
}
;
var _wr_skeleton_bone_get_position = Module["_wr_skeleton_bone_get_position"] = function() {
    return (_wr_skeleton_bone_get_position = Module["_wr_skeleton_bone_get_position"] = Module["asm"]["Wc"]).apply(null, arguments)
}
;
var _wr_skeleton_bone_get_orientation = Module["_wr_skeleton_bone_get_orientation"] = function() {
    return (_wr_skeleton_bone_get_orientation = Module["_wr_skeleton_bone_get_orientation"] = Module["asm"]["Xc"]).apply(null, arguments)
}
;
var _wr_gl_state_is_anisotropic_texture_filtering_supported = Module["_wr_gl_state_is_anisotropic_texture_filtering_supported"] = function() {
    return (_wr_gl_state_is_anisotropic_texture_filtering_supported = Module["_wr_gl_state_is_anisotropic_texture_filtering_supported"] = Module["asm"]["Yc"]).apply(null, arguments)
}
;
var _wr_texture_cubemap_new = Module["_wr_texture_cubemap_new"] = function() {
    return (_wr_texture_cubemap_new = Module["_wr_texture_cubemap_new"] = Module["asm"]["Zc"]).apply(null, arguments)
}
;
var _wr_texture_cubemap_set_data = Module["_wr_texture_cubemap_set_data"] = function() {
    return (_wr_texture_cubemap_set_data = Module["_wr_texture_cubemap_set_data"] = Module["asm"]["_c"]).apply(null, arguments)
}
;
var _wr_texture_cubemap_disable_automatic_mip_map_generation = Module["_wr_texture_cubemap_disable_automatic_mip_map_generation"] = function() {
    return (_wr_texture_cubemap_disable_automatic_mip_map_generation = Module["_wr_texture_cubemap_disable_automatic_mip_map_generation"] = Module["asm"]["$c"]).apply(null, arguments)
}
;
var _wr_shader_program_new = Module["_wr_shader_program_new"] = function() {
    return (_wr_shader_program_new = Module["_wr_shader_program_new"] = Module["asm"]["ad"]).apply(null, arguments)
}
;
var _wr_shader_program_delete = Module["_wr_shader_program_delete"] = function() {
    return (_wr_shader_program_delete = Module["_wr_shader_program_delete"] = Module["asm"]["bd"]).apply(null, arguments)
}
;
var _wr_shader_program_set_vertex_shader_path = Module["_wr_shader_program_set_vertex_shader_path"] = function() {
    return (_wr_shader_program_set_vertex_shader_path = Module["_wr_shader_program_set_vertex_shader_path"] = Module["asm"]["cd"]).apply(null, arguments)
}
;
var _wr_shader_program_set_fragment_shader_path = Module["_wr_shader_program_set_fragment_shader_path"] = function() {
    return (_wr_shader_program_set_fragment_shader_path = Module["_wr_shader_program_set_fragment_shader_path"] = Module["asm"]["dd"]).apply(null, arguments)
}
;
var _wr_shader_program_use_uniform = Module["_wr_shader_program_use_uniform"] = function() {
    return (_wr_shader_program_use_uniform = Module["_wr_shader_program_use_uniform"] = Module["asm"]["ed"]).apply(null, arguments)
}
;
var _wr_shader_program_use_uniform_buffer = Module["_wr_shader_program_use_uniform_buffer"] = function() {
    return (_wr_shader_program_use_uniform_buffer = Module["_wr_shader_program_use_uniform_buffer"] = Module["asm"]["fd"]).apply(null, arguments)
}
;
var _wr_shader_program_create_custom_uniform = Module["_wr_shader_program_create_custom_uniform"] = function() {
    return (_wr_shader_program_create_custom_uniform = Module["_wr_shader_program_create_custom_uniform"] = Module["asm"]["gd"]).apply(null, arguments)
}
;
var _wr_shader_program_set_custom_uniform_value = Module["_wr_shader_program_set_custom_uniform_value"] = function() {
    return (_wr_shader_program_set_custom_uniform_value = Module["_wr_shader_program_set_custom_uniform_value"] = Module["asm"]["hd"]).apply(null, arguments)
}
;
var _wr_shader_program_get_gl_name = Module["_wr_shader_program_get_gl_name"] = function() {
    return (_wr_shader_program_get_gl_name = Module["_wr_shader_program_get_gl_name"] = Module["asm"]["id"]).apply(null, arguments)
}
;
var _wr_shader_program_has_vertex_shader_compilation_failed = Module["_wr_shader_program_has_vertex_shader_compilation_failed"] = function() {
    return (_wr_shader_program_has_vertex_shader_compilation_failed = Module["_wr_shader_program_has_vertex_shader_compilation_failed"] = Module["asm"]["jd"]).apply(null, arguments)
}
;
var _wr_shader_program_has_fragment_shader_compilation_failed = Module["_wr_shader_program_has_fragment_shader_compilation_failed"] = function() {
    return (_wr_shader_program_has_fragment_shader_compilation_failed = Module["_wr_shader_program_has_fragment_shader_compilation_failed"] = Module["asm"]["kd"]).apply(null, arguments)
}
;
var _wr_shader_program_get_compilation_log = Module["_wr_shader_program_get_compilation_log"] = function() {
    return (_wr_shader_program_get_compilation_log = Module["_wr_shader_program_get_compilation_log"] = Module["asm"]["ld"]).apply(null, arguments)
}
;
var _wr_shader_program_setup = Module["_wr_shader_program_setup"] = function() {
    return (_wr_shader_program_setup = Module["_wr_shader_program_setup"] = Module["asm"]["md"]).apply(null, arguments)
}
;
var _wr_transform_new = Module["_wr_transform_new"] = function() {
    return (_wr_transform_new = Module["_wr_transform_new"] = Module["asm"]["nd"]).apply(null, arguments)
}
;
var _wr_transform_copy = Module["_wr_transform_copy"] = function() {
    return (_wr_transform_copy = Module["_wr_transform_copy"] = Module["asm"]["od"]).apply(null, arguments)
}
;
var _wr_transform_get_matrix = Module["_wr_transform_get_matrix"] = function() {
    return (_wr_transform_get_matrix = Module["_wr_transform_get_matrix"] = Module["asm"]["pd"]).apply(null, arguments)
}
;
var _wr_transform_attach_child = Module["_wr_transform_attach_child"] = function() {
    return (_wr_transform_attach_child = Module["_wr_transform_attach_child"] = Module["asm"]["qd"]).apply(null, arguments)
}
;
var _wr_transform_detach_child = Module["_wr_transform_detach_child"] = function() {
    return (_wr_transform_detach_child = Module["_wr_transform_detach_child"] = Module["asm"]["rd"]).apply(null, arguments)
}
;
var _wr_transform_set_position = Module["_wr_transform_set_position"] = function() {
    return (_wr_transform_set_position = Module["_wr_transform_set_position"] = Module["asm"]["sd"]).apply(null, arguments)
}
;
var _wr_transform_set_absolute_position = Module["_wr_transform_set_absolute_position"] = function() {
    return (_wr_transform_set_absolute_position = Module["_wr_transform_set_absolute_position"] = Module["asm"]["td"]).apply(null, arguments)
}
;
var _wr_transform_set_orientation = Module["_wr_transform_set_orientation"] = function() {
    return (_wr_transform_set_orientation = Module["_wr_transform_set_orientation"] = Module["asm"]["ud"]).apply(null, arguments)
}
;
var _wr_transform_set_absolute_orientation = Module["_wr_transform_set_absolute_orientation"] = function() {
    return (_wr_transform_set_absolute_orientation = Module["_wr_transform_set_absolute_orientation"] = Module["asm"]["vd"]).apply(null, arguments)
}
;
var _wr_transform_set_scale = Module["_wr_transform_set_scale"] = function() {
    return (_wr_transform_set_scale = Module["_wr_transform_set_scale"] = Module["asm"]["wd"]).apply(null, arguments)
}
;
var _wr_transform_set_position_and_orientation = Module["_wr_transform_set_position_and_orientation"] = function() {
    return (_wr_transform_set_position_and_orientation = Module["_wr_transform_set_position_and_orientation"] = Module["asm"]["xd"]).apply(null, arguments)
}
;
var _wr_gl_state_is_initialized = Module["_wr_gl_state_is_initialized"] = function() {
    return (_wr_gl_state_is_initialized = Module["_wr_gl_state_is_initialized"] = Module["asm"]["yd"]).apply(null, arguments)
}
;
var _wr_gl_state_set_context_active = Module["_wr_gl_state_set_context_active"] = function() {
    return (_wr_gl_state_set_context_active = Module["_wr_gl_state_set_context_active"] = Module["asm"]["zd"]).apply(null, arguments)
}
;
var _wr_gl_state_get_vendor = Module["_wr_gl_state_get_vendor"] = function() {
    return (_wr_gl_state_get_vendor = Module["_wr_gl_state_get_vendor"] = Module["asm"]["Ad"]).apply(null, arguments)
}
;
var _wr_gl_state_get_renderer = Module["_wr_gl_state_get_renderer"] = function() {
    return (_wr_gl_state_get_renderer = Module["_wr_gl_state_get_renderer"] = Module["asm"]["Bd"]).apply(null, arguments)
}
;
var _wr_gl_state_get_version = Module["_wr_gl_state_get_version"] = function() {
    return (_wr_gl_state_get_version = Module["_wr_gl_state_get_version"] = Module["asm"]["Cd"]).apply(null, arguments)
}
;
var _wr_gl_state_get_glsl_version = Module["_wr_gl_state_get_glsl_version"] = function() {
    return (_wr_gl_state_get_glsl_version = Module["_wr_gl_state_get_glsl_version"] = Module["asm"]["Dd"]).apply(null, arguments)
}
;
var _wr_gl_state_get_gpu_memory = Module["_wr_gl_state_get_gpu_memory"] = function() {
    return (_wr_gl_state_get_gpu_memory = Module["_wr_gl_state_get_gpu_memory"] = Module["asm"]["Ed"]).apply(null, arguments)
}
;
var _wr_gl_state_max_texture_anisotropy = Module["_wr_gl_state_max_texture_anisotropy"] = function() {
    return (_wr_gl_state_max_texture_anisotropy = Module["_wr_gl_state_max_texture_anisotropy"] = Module["asm"]["Fd"]).apply(null, arguments)
}
;
var _wr_gl_state_disable_check_error = Module["_wr_gl_state_disable_check_error"] = function() {
    return (_wr_gl_state_disable_check_error = Module["_wr_gl_state_disable_check_error"] = Module["asm"]["Gd"]).apply(null, arguments)
}
;
var _wr_camera_new = Module["_wr_camera_new"] = function() {
    return (_wr_camera_new = Module["_wr_camera_new"] = Module["asm"]["Hd"]).apply(null, arguments)
}
;
var _wr_camera_set_projection_mode = Module["_wr_camera_set_projection_mode"] = function() {
    return (_wr_camera_set_projection_mode = Module["_wr_camera_set_projection_mode"] = Module["asm"]["Id"]).apply(null, arguments)
}
;
var _wr_camera_set_aspect_ratio = Module["_wr_camera_set_aspect_ratio"] = function() {
    return (_wr_camera_set_aspect_ratio = Module["_wr_camera_set_aspect_ratio"] = Module["asm"]["Jd"]).apply(null, arguments)
}
;
var _wr_camera_set_near = Module["_wr_camera_set_near"] = function() {
    return (_wr_camera_set_near = Module["_wr_camera_set_near"] = Module["asm"]["Kd"]).apply(null, arguments)
}
;
var _wr_camera_set_far = Module["_wr_camera_set_far"] = function() {
    return (_wr_camera_set_far = Module["_wr_camera_set_far"] = Module["asm"]["Ld"]).apply(null, arguments)
}
;
var _wr_camera_set_fovy = Module["_wr_camera_set_fovy"] = function() {
    return (_wr_camera_set_fovy = Module["_wr_camera_set_fovy"] = Module["asm"]["Md"]).apply(null, arguments)
}
;
var _wr_camera_set_height = Module["_wr_camera_set_height"] = function() {
    return (_wr_camera_set_height = Module["_wr_camera_set_height"] = Module["asm"]["Nd"]).apply(null, arguments)
}
;
var _wr_camera_set_position = Module["_wr_camera_set_position"] = function() {
    return (_wr_camera_set_position = Module["_wr_camera_set_position"] = Module["asm"]["Od"]).apply(null, arguments)
}
;
var _wr_camera_set_orientation = Module["_wr_camera_set_orientation"] = function() {
    return (_wr_camera_set_orientation = Module["_wr_camera_set_orientation"] = Module["asm"]["Pd"]).apply(null, arguments)
}
;
var _wr_camera_set_flip_y = Module["_wr_camera_set_flip_y"] = function() {
    return (_wr_camera_set_flip_y = Module["_wr_camera_set_flip_y"] = Module["asm"]["Qd"]).apply(null, arguments)
}
;
var _wr_camera_apply_yaw = Module["_wr_camera_apply_yaw"] = function() {
    return (_wr_camera_apply_yaw = Module["_wr_camera_apply_yaw"] = Module["asm"]["Rd"]).apply(null, arguments)
}
;
var _wr_camera_apply_pitch = Module["_wr_camera_apply_pitch"] = function() {
    return (_wr_camera_apply_pitch = Module["_wr_camera_apply_pitch"] = Module["asm"]["Sd"]).apply(null, arguments)
}
;
var _wr_camera_apply_roll = Module["_wr_camera_apply_roll"] = function() {
    return (_wr_camera_apply_roll = Module["_wr_camera_apply_roll"] = Module["asm"]["Td"]).apply(null, arguments)
}
;
var _wr_camera_get_near = Module["_wr_camera_get_near"] = function() {
    return (_wr_camera_get_near = Module["_wr_camera_get_near"] = Module["asm"]["Ud"]).apply(null, arguments)
}
;
var _wr_camera_get_far = Module["_wr_camera_get_far"] = function() {
    return (_wr_camera_get_far = Module["_wr_camera_get_far"] = Module["asm"]["Vd"]).apply(null, arguments)
}
;
var _wr_camera_get_fovy = Module["_wr_camera_get_fovy"] = function() {
    return (_wr_camera_get_fovy = Module["_wr_camera_get_fovy"] = Module["asm"]["Wd"]).apply(null, arguments)
}
;
var _wr_camera_get_height = Module["_wr_camera_get_height"] = function() {
    return (_wr_camera_get_height = Module["_wr_camera_get_height"] = Module["asm"]["Xd"]).apply(null, arguments)
}
;
var _wr_renderable_new = Module["_wr_renderable_new"] = function() {
    return (_wr_renderable_new = Module["_wr_renderable_new"] = Module["asm"]["Yd"]).apply(null, arguments)
}
;
var _wr_renderable_set_mesh = Module["_wr_renderable_set_mesh"] = function() {
    return (_wr_renderable_set_mesh = Module["_wr_renderable_set_mesh"] = Module["asm"]["Zd"]).apply(null, arguments)
}
;
var _wr_renderable_set_material = Module["_wr_renderable_set_material"] = function() {
    return (_wr_renderable_set_material = Module["_wr_renderable_set_material"] = Module["asm"]["_d"]).apply(null, arguments)
}
;
var _wr_renderable_set_drawing_mode = Module["_wr_renderable_set_drawing_mode"] = function() {
    return (_wr_renderable_set_drawing_mode = Module["_wr_renderable_set_drawing_mode"] = Module["asm"]["$d"]).apply(null, arguments)
}
;
var _wr_renderable_set_visibility_flags = Module["_wr_renderable_set_visibility_flags"] = function() {
    return (_wr_renderable_set_visibility_flags = Module["_wr_renderable_set_visibility_flags"] = Module["asm"]["ae"]).apply(null, arguments)
}
;
var _wr_renderable_set_cast_shadows = Module["_wr_renderable_set_cast_shadows"] = function() {
    return (_wr_renderable_set_cast_shadows = Module["_wr_renderable_set_cast_shadows"] = Module["asm"]["be"]).apply(null, arguments)
}
;
var _wr_renderable_set_receive_shadows = Module["_wr_renderable_set_receive_shadows"] = function() {
    return (_wr_renderable_set_receive_shadows = Module["_wr_renderable_set_receive_shadows"] = Module["asm"]["ce"]).apply(null, arguments)
}
;
var _wr_renderable_set_scene_culling = Module["_wr_renderable_set_scene_culling"] = function() {
    return (_wr_renderable_set_scene_culling = Module["_wr_renderable_set_scene_culling"] = Module["asm"]["de"]).apply(null, arguments)
}
;
var _wr_renderable_set_face_culling = Module["_wr_renderable_set_face_culling"] = function() {
    return (_wr_renderable_set_face_culling = Module["_wr_renderable_set_face_culling"] = Module["asm"]["ee"]).apply(null, arguments)
}
;
var _wr_renderable_set_in_view_space = Module["_wr_renderable_set_in_view_space"] = function() {
    return (_wr_renderable_set_in_view_space = Module["_wr_renderable_set_in_view_space"] = Module["asm"]["fe"]).apply(null, arguments)
}
;
var _wr_renderable_set_z_sorted_rendering = Module["_wr_renderable_set_z_sorted_rendering"] = function() {
    return (_wr_renderable_set_z_sorted_rendering = Module["_wr_renderable_set_z_sorted_rendering"] = Module["asm"]["ge"]).apply(null, arguments)
}
;
var _wr_renderable_get_material = Module["_wr_renderable_get_material"] = function() {
    return (_wr_renderable_get_material = Module["_wr_renderable_get_material"] = Module["asm"]["he"]).apply(null, arguments)
}
;
var _wr_renderable_get_bounding_sphere = Module["_wr_renderable_get_bounding_sphere"] = function() {
    return (_wr_renderable_get_bounding_sphere = Module["_wr_renderable_get_bounding_sphere"] = Module["asm"]["ie"]).apply(null, arguments)
}
;
var _wr_renderable_set_drawing_order = Module["_wr_renderable_set_drawing_order"] = function() {
    return (_wr_renderable_set_drawing_order = Module["_wr_renderable_set_drawing_order"] = Module["asm"]["je"]).apply(null, arguments)
}
;
var _wr_renderable_set_point_size = Module["_wr_renderable_set_point_size"] = function() {
    return (_wr_renderable_set_point_size = Module["_wr_renderable_set_point_size"] = Module["asm"]["ke"]).apply(null, arguments)
}
;
var _wr_directional_light_new = Module["_wr_directional_light_new"] = function() {
    return (_wr_directional_light_new = Module["_wr_directional_light_new"] = Module["asm"]["le"]).apply(null, arguments)
}
;
var _wr_directional_light_set_color = Module["_wr_directional_light_set_color"] = function() {
    return (_wr_directional_light_set_color = Module["_wr_directional_light_set_color"] = Module["asm"]["me"]).apply(null, arguments)
}
;
var _wr_directional_light_set_intensity = Module["_wr_directional_light_set_intensity"] = function() {
    return (_wr_directional_light_set_intensity = Module["_wr_directional_light_set_intensity"] = Module["asm"]["ne"]).apply(null, arguments)
}
;
var _wr_directional_light_set_ambient_intensity = Module["_wr_directional_light_set_ambient_intensity"] = function() {
    return (_wr_directional_light_set_ambient_intensity = Module["_wr_directional_light_set_ambient_intensity"] = Module["asm"]["oe"]).apply(null, arguments)
}
;
var _wr_directional_light_set_on = Module["_wr_directional_light_set_on"] = function() {
    return (_wr_directional_light_set_on = Module["_wr_directional_light_set_on"] = Module["asm"]["pe"]).apply(null, arguments)
}
;
var _wr_directional_light_set_cast_shadows = Module["_wr_directional_light_set_cast_shadows"] = function() {
    return (_wr_directional_light_set_cast_shadows = Module["_wr_directional_light_set_cast_shadows"] = Module["asm"]["qe"]).apply(null, arguments)
}
;
var _wr_directional_light_set_direction = Module["_wr_directional_light_set_direction"] = function() {
    return (_wr_directional_light_set_direction = Module["_wr_directional_light_set_direction"] = Module["asm"]["re"]).apply(null, arguments)
}
;
var _wr_texture_delete = Module["_wr_texture_delete"] = function() {
    return (_wr_texture_delete = Module["_wr_texture_delete"] = Module["asm"]["se"]).apply(null, arguments)
}
;
var _wr_texture_set_internal_format = Module["_wr_texture_set_internal_format"] = function() {
    return (_wr_texture_set_internal_format = Module["_wr_texture_set_internal_format"] = Module["asm"]["te"]).apply(null, arguments)
}
;
var _wr_texture_set_texture_unit = Module["_wr_texture_set_texture_unit"] = function() {
    return (_wr_texture_set_texture_unit = Module["_wr_texture_set_texture_unit"] = Module["asm"]["ue"]).apply(null, arguments)
}
;
var _wr_texture_set_size = Module["_wr_texture_set_size"] = function() {
    return (_wr_texture_set_size = Module["_wr_texture_set_size"] = Module["asm"]["ve"]).apply(null, arguments)
}
;
var _wr_texture_set_translucent = Module["_wr_texture_set_translucent"] = function() {
    return (_wr_texture_set_translucent = Module["_wr_texture_set_translucent"] = Module["asm"]["we"]).apply(null, arguments)
}
;
var _wr_texture_change_data = Module["_wr_texture_change_data"] = function() {
    return (_wr_texture_change_data = Module["_wr_texture_change_data"] = Module["asm"]["xe"]).apply(null, arguments)
}
;
var _wr_texture_setup = Module["_wr_texture_setup"] = function() {
    return (_wr_texture_setup = Module["_wr_texture_setup"] = Module["asm"]["ye"]).apply(null, arguments)
}
;
var _wr_texture_get_width = Module["_wr_texture_get_width"] = function() {
    return (_wr_texture_get_width = Module["_wr_texture_get_width"] = Module["asm"]["ze"]).apply(null, arguments)
}
;
var _wr_texture_get_height = Module["_wr_texture_get_height"] = function() {
    return (_wr_texture_get_height = Module["_wr_texture_get_height"] = Module["asm"]["Ae"]).apply(null, arguments)
}
;
var _wr_texture_is_translucent = Module["_wr_texture_is_translucent"] = function() {
    return (_wr_texture_is_translucent = Module["_wr_texture_is_translucent"] = Module["asm"]["Be"]).apply(null, arguments)
}
;
var _wr_texture_get_type = Module["_wr_texture_get_type"] = function() {
    return (_wr_texture_get_type = Module["_wr_texture_get_type"] = Module["asm"]["Ce"]).apply(null, arguments)
}
;
var _wr_texture_get_gl_name = Module["_wr_texture_get_gl_name"] = function() {
    return (_wr_texture_get_gl_name = Module["_wr_texture_get_gl_name"] = Module["asm"]["De"]).apply(null, arguments)
}
;
var _wr_scene_get_instance = Module["_wr_scene_get_instance"] = function() {
    return (_wr_scene_get_instance = Module["_wr_scene_get_instance"] = Module["asm"]["Ee"]).apply(null, arguments)
}
;
var _wr_scene_destroy = Module["_wr_scene_destroy"] = function() {
    return (_wr_scene_destroy = Module["_wr_scene_destroy"] = Module["asm"]["Fe"]).apply(null, arguments)
}
;
var _wr_scene_init = Module["_wr_scene_init"] = function() {
    return (_wr_scene_init = Module["_wr_scene_init"] = Module["asm"]["Ge"]).apply(null, arguments)
}
;
var _wr_scene_apply_pending_updates = Module["_wr_scene_apply_pending_updates"] = function() {
    return (_wr_scene_apply_pending_updates = Module["_wr_scene_apply_pending_updates"] = Module["asm"]["He"]).apply(null, arguments)
}
;
var _wr_scene_get_main_buffer = Module["_wr_scene_get_main_buffer"] = function() {
    return (_wr_scene_get_main_buffer = Module["_wr_scene_get_main_buffer"] = Module["asm"]["Ie"]).apply(null, arguments)
}
;
var _wr_scene_init_frame_capture = Module["_wr_scene_init_frame_capture"] = function() {
    return (_wr_scene_init_frame_capture = Module["_wr_scene_init_frame_capture"] = Module["asm"]["Je"]).apply(null, arguments)
}
;
var _wr_scene_bind_pixel_buffer = Module["_wr_scene_bind_pixel_buffer"] = function() {
    return (_wr_scene_bind_pixel_buffer = Module["_wr_scene_bind_pixel_buffer"] = Module["asm"]["Ke"]).apply(null, arguments)
}
;
var _wr_scene_map_pixel_buffer = Module["_wr_scene_map_pixel_buffer"] = function() {
    return (_wr_scene_map_pixel_buffer = Module["_wr_scene_map_pixel_buffer"] = Module["asm"]["Le"]).apply(null, arguments)
}
;
var _wr_scene_unmap_pixel_buffer = Module["_wr_scene_unmap_pixel_buffer"] = function() {
    return (_wr_scene_unmap_pixel_buffer = Module["_wr_scene_unmap_pixel_buffer"] = Module["asm"]["Me"]).apply(null, arguments)
}
;
var _wr_scene_terminate_frame_capture = Module["_wr_scene_terminate_frame_capture"] = function() {
    return (_wr_scene_terminate_frame_capture = Module["_wr_scene_terminate_frame_capture"] = Module["asm"]["Ne"]).apply(null, arguments)
}
;
var _wr_scene_render = Module["_wr_scene_render"] = function() {
    return (_wr_scene_render = Module["_wr_scene_render"] = Module["asm"]["Oe"]).apply(null, arguments)
}
;
var _wr_scene_render_to_viewports = Module["_wr_scene_render_to_viewports"] = function() {
    return (_wr_scene_render_to_viewports = Module["_wr_scene_render_to_viewports"] = Module["asm"]["Pe"]).apply(null, arguments)
}
;
var _wr_scene_reset = Module["_wr_scene_reset"] = function() {
    return (_wr_scene_reset = Module["_wr_scene_reset"] = Module["asm"]["Qe"]).apply(null, arguments)
}
;
var _wr_scene_set_ambient_light = Module["_wr_scene_set_ambient_light"] = function() {
    return (_wr_scene_set_ambient_light = Module["_wr_scene_set_ambient_light"] = Module["asm"]["Re"]).apply(null, arguments)
}
;
var _wr_scene_get_active_spot_light_count = Module["_wr_scene_get_active_spot_light_count"] = function() {
    return (_wr_scene_get_active_spot_light_count = Module["_wr_scene_get_active_spot_light_count"] = Module["asm"]["Se"]).apply(null, arguments)
}
;
var _wr_scene_get_active_point_light_count = Module["_wr_scene_get_active_point_light_count"] = function() {
    return (_wr_scene_get_active_point_light_count = Module["_wr_scene_get_active_point_light_count"] = Module["asm"]["Te"]).apply(null, arguments)
}
;
var _wr_scene_get_active_directional_light_count = Module["_wr_scene_get_active_directional_light_count"] = function() {
    return (_wr_scene_get_active_directional_light_count = Module["_wr_scene_get_active_directional_light_count"] = Module["asm"]["Ue"]).apply(null, arguments)
}
;
var _wr_scene_set_fog = Module["_wr_scene_set_fog"] = function() {
    return (_wr_scene_set_fog = Module["_wr_scene_set_fog"] = Module["asm"]["Ve"]).apply(null, arguments)
}
;
var _wr_scene_set_skybox = Module["_wr_scene_set_skybox"] = function() {
    return (_wr_scene_set_skybox = Module["_wr_scene_set_skybox"] = Module["asm"]["We"]).apply(null, arguments)
}
;
var _wr_scene_set_hdr_clear_quad = Module["_wr_scene_set_hdr_clear_quad"] = function() {
    return (_wr_scene_set_hdr_clear_quad = Module["_wr_scene_set_hdr_clear_quad"] = Module["asm"]["Xe"]).apply(null, arguments)
}
;
var _wr_scene_set_fog_program = Module["_wr_scene_set_fog_program"] = function() {
    return (_wr_scene_set_fog_program = Module["_wr_scene_set_fog_program"] = Module["asm"]["Ye"]).apply(null, arguments)
}
;
var _wr_scene_set_shadow_volume_program = Module["_wr_scene_set_shadow_volume_program"] = function() {
    return (_wr_scene_set_shadow_volume_program = Module["_wr_scene_set_shadow_volume_program"] = Module["asm"]["Ze"]).apply(null, arguments)
}
;
var _wr_scene_enable_depth_reset = Module["_wr_scene_enable_depth_reset"] = function() {
    return (_wr_scene_enable_depth_reset = Module["_wr_scene_enable_depth_reset"] = Module["asm"]["_e"]).apply(null, arguments)
}
;
var _wr_scene_enable_skybox = Module["_wr_scene_enable_skybox"] = function() {
    return (_wr_scene_enable_skybox = Module["_wr_scene_enable_skybox"] = Module["asm"]["$e"]).apply(null, arguments)
}
;
var _wr_scene_enable_hdr_clear = Module["_wr_scene_enable_hdr_clear"] = function() {
    return (_wr_scene_enable_hdr_clear = Module["_wr_scene_enable_hdr_clear"] = Module["asm"]["af"]).apply(null, arguments)
}
;
var _wr_scene_enable_translucence = Module["_wr_scene_enable_translucence"] = function() {
    return (_wr_scene_enable_translucence = Module["_wr_scene_enable_translucence"] = Module["asm"]["bf"]).apply(null, arguments)
}
;
var _wr_scene_compute_node_count = Module["_wr_scene_compute_node_count"] = function() {
    return (_wr_scene_compute_node_count = Module["_wr_scene_compute_node_count"] = Module["asm"]["cf"]).apply(null, arguments)
}
;
var _wr_scene_get_root = Module["_wr_scene_get_root"] = function() {
    return (_wr_scene_get_root = Module["_wr_scene_get_root"] = Module["asm"]["df"]).apply(null, arguments)
}
;
var _wr_scene_get_viewport = Module["_wr_scene_get_viewport"] = function() {
    return (_wr_scene_get_viewport = Module["_wr_scene_get_viewport"] = Module["asm"]["ef"]).apply(null, arguments)
}
;
var _wr_scene_add_frame_listener = Module["_wr_scene_add_frame_listener"] = function() {
    return (_wr_scene_add_frame_listener = Module["_wr_scene_add_frame_listener"] = Module["asm"]["ff"]).apply(null, arguments)
}
;
var _wr_scene_remove_frame_listener = Module["_wr_scene_remove_frame_listener"] = function() {
    return (_wr_scene_remove_frame_listener = Module["_wr_scene_remove_frame_listener"] = Module["asm"]["gf"]).apply(null, arguments)
}
;
var _wr_texture_2d_new = Module["_wr_texture_2d_new"] = function() {
    return (_wr_texture_2d_new = Module["_wr_texture_2d_new"] = Module["asm"]["hf"]).apply(null, arguments)
}
;
var _wr_texture_2d_copy_from_cache = Module["_wr_texture_2d_copy_from_cache"] = function() {
    return (_wr_texture_2d_copy_from_cache = Module["_wr_texture_2d_copy_from_cache"] = Module["asm"]["jf"]).apply(null, arguments)
}
;
var _wr_texture_2d_set_data = Module["_wr_texture_2d_set_data"] = function() {
    return (_wr_texture_2d_set_data = Module["_wr_texture_2d_set_data"] = Module["asm"]["kf"]).apply(null, arguments)
}
;
var _wr_texture_2d_set_file_path = Module["_wr_texture_2d_set_file_path"] = function() {
    return (_wr_texture_2d_set_file_path = Module["_wr_texture_2d_set_file_path"] = Module["asm"]["lf"]).apply(null, arguments)
}
;
var _wr_texture_2d_set_cache_persistency = Module["_wr_texture_2d_set_cache_persistency"] = function() {
    return (_wr_texture_2d_set_cache_persistency = Module["_wr_texture_2d_set_cache_persistency"] = Module["asm"]["mf"]).apply(null, arguments)
}
;
var _wr_texture_rtt_new = Module["_wr_texture_rtt_new"] = function() {
    return (_wr_texture_rtt_new = Module["_wr_texture_rtt_new"] = Module["asm"]["nf"]).apply(null, arguments)
}
;
var _wr_texture_rtt_enable_initialize_data = Module["_wr_texture_rtt_enable_initialize_data"] = function() {
    return (_wr_texture_rtt_enable_initialize_data = Module["_wr_texture_rtt_enable_initialize_data"] = Module["asm"]["of"]).apply(null, arguments)
}
;
var _wr_texture_cubemap_bake_diffuse_irradiance = Module["_wr_texture_cubemap_bake_diffuse_irradiance"] = function() {
    return (_wr_texture_cubemap_bake_diffuse_irradiance = Module["_wr_texture_cubemap_bake_diffuse_irradiance"] = Module["asm"]["pf"]).apply(null, arguments)
}
;
var _wr_texture_cubemap_bake_specular_irradiance = Module["_wr_texture_cubemap_bake_specular_irradiance"] = function() {
    return (_wr_texture_cubemap_bake_specular_irradiance = Module["_wr_texture_cubemap_bake_specular_irradiance"] = Module["asm"]["qf"]).apply(null, arguments)
}
;
var _wr_texture_cubemap_bake_brdf = Module["_wr_texture_cubemap_bake_brdf"] = function() {
    return (_wr_texture_cubemap_bake_brdf = Module["_wr_texture_cubemap_bake_brdf"] = Module["asm"]["rf"]).apply(null, arguments)
}
;
var _wr_config_enable_shadows = Module["_wr_config_enable_shadows"] = function() {
    return (_wr_config_enable_shadows = Module["_wr_config_enable_shadows"] = Module["asm"]["sf"]).apply(null, arguments)
}
;
var _wr_config_enable_point_size = Module["_wr_config_enable_point_size"] = function() {
    return (_wr_config_enable_point_size = Module["_wr_config_enable_point_size"] = Module["asm"]["tf"]).apply(null, arguments)
}
;
var _wr_config_get_line_scale = Module["_wr_config_get_line_scale"] = function() {
    return (_wr_config_get_line_scale = Module["_wr_config_get_line_scale"] = Module["asm"]["uf"]).apply(null, arguments)
}
;
var _wr_config_get_max_active_spot_light_count = Module["_wr_config_get_max_active_spot_light_count"] = function() {
    return (_wr_config_get_max_active_spot_light_count = Module["_wr_config_get_max_active_spot_light_count"] = Module["asm"]["vf"]).apply(null, arguments)
}
;
var _wr_config_get_max_active_point_light_count = Module["_wr_config_get_max_active_point_light_count"] = function() {
    return (_wr_config_get_max_active_point_light_count = Module["_wr_config_get_max_active_point_light_count"] = Module["asm"]["wf"]).apply(null, arguments)
}
;
var _wr_config_get_max_active_directional_light_count = Module["_wr_config_get_max_active_directional_light_count"] = function() {
    return (_wr_config_get_max_active_directional_light_count = Module["_wr_config_get_max_active_directional_light_count"] = Module["asm"]["xf"]).apply(null, arguments)
}
;
var _wr_phong_material_new = Module["_wr_phong_material_new"] = function() {
    return (_wr_phong_material_new = Module["_wr_phong_material_new"] = Module["asm"]["yf"]).apply(null, arguments)
}
;
var _wr_phong_material_clear = Module["_wr_phong_material_clear"] = function() {
    return (_wr_phong_material_clear = Module["_wr_phong_material_clear"] = Module["asm"]["zf"]).apply(null, arguments)
}
;
var _wr_phong_material_set_transparency = Module["_wr_phong_material_set_transparency"] = function() {
    return (_wr_phong_material_set_transparency = Module["_wr_phong_material_set_transparency"] = Module["asm"]["Af"]).apply(null, arguments)
}
;
var _wr_phong_material_set_color = Module["_wr_phong_material_set_color"] = function() {
    return (_wr_phong_material_set_color = Module["_wr_phong_material_set_color"] = Module["asm"]["Bf"]).apply(null, arguments)
}
;
var _wr_phong_material_set_ambient = Module["_wr_phong_material_set_ambient"] = function() {
    return (_wr_phong_material_set_ambient = Module["_wr_phong_material_set_ambient"] = Module["asm"]["Cf"]).apply(null, arguments)
}
;
var _wr_phong_material_set_diffuse = Module["_wr_phong_material_set_diffuse"] = function() {
    return (_wr_phong_material_set_diffuse = Module["_wr_phong_material_set_diffuse"] = Module["asm"]["Df"]).apply(null, arguments)
}
;
var _wr_phong_material_set_linear_ambient = Module["_wr_phong_material_set_linear_ambient"] = function() {
    return (_wr_phong_material_set_linear_ambient = Module["_wr_phong_material_set_linear_ambient"] = Module["asm"]["Ef"]).apply(null, arguments)
}
;
var _wr_phong_material_set_linear_diffuse = Module["_wr_phong_material_set_linear_diffuse"] = function() {
    return (_wr_phong_material_set_linear_diffuse = Module["_wr_phong_material_set_linear_diffuse"] = Module["asm"]["Ff"]).apply(null, arguments)
}
;
var _wr_phong_material_set_specular = Module["_wr_phong_material_set_specular"] = function() {
    return (_wr_phong_material_set_specular = Module["_wr_phong_material_set_specular"] = Module["asm"]["Gf"]).apply(null, arguments)
}
;
var _wr_phong_material_set_emissive = Module["_wr_phong_material_set_emissive"] = function() {
    return (_wr_phong_material_set_emissive = Module["_wr_phong_material_set_emissive"] = Module["asm"]["Hf"]).apply(null, arguments)
}
;
var _wr_phong_material_set_shininess = Module["_wr_phong_material_set_shininess"] = function() {
    return (_wr_phong_material_set_shininess = Module["_wr_phong_material_set_shininess"] = Module["asm"]["If"]).apply(null, arguments)
}
;
var _wr_phong_material_set_all_parameters = Module["_wr_phong_material_set_all_parameters"] = function() {
    return (_wr_phong_material_set_all_parameters = Module["_wr_phong_material_set_all_parameters"] = Module["asm"]["Jf"]).apply(null, arguments)
}
;
var _wr_phong_material_set_color_per_vertex = Module["_wr_phong_material_set_color_per_vertex"] = function() {
    return (_wr_phong_material_set_color_per_vertex = Module["_wr_phong_material_set_color_per_vertex"] = Module["asm"]["Kf"]).apply(null, arguments)
}
;
var _wr_phong_material_is_translucent = Module["_wr_phong_material_is_translucent"] = function() {
    return (_wr_phong_material_is_translucent = Module["_wr_phong_material_is_translucent"] = Module["asm"]["Lf"]).apply(null, arguments)
}
;
var _wr_viewport_new = Module["_wr_viewport_new"] = function() {
    return (_wr_viewport_new = Module["_wr_viewport_new"] = Module["asm"]["Mf"]).apply(null, arguments)
}
;
var _wr_viewport_delete = Module["_wr_viewport_delete"] = function() {
    return (_wr_viewport_delete = Module["_wr_viewport_delete"] = Module["asm"]["Nf"]).apply(null, arguments)
}
;
var _wr_viewport_set_clear_color_rgb = Module["_wr_viewport_set_clear_color_rgb"] = function() {
    return (_wr_viewport_set_clear_color_rgb = Module["_wr_viewport_set_clear_color_rgb"] = Module["asm"]["Of"]).apply(null, arguments)
}
;
var _wr_viewport_set_clear_color_rgba = Module["_wr_viewport_set_clear_color_rgba"] = function() {
    return (_wr_viewport_set_clear_color_rgba = Module["_wr_viewport_set_clear_color_rgba"] = Module["asm"]["Pf"]).apply(null, arguments)
}
;
var _wr_viewport_set_polygon_mode = Module["_wr_viewport_set_polygon_mode"] = function() {
    return (_wr_viewport_set_polygon_mode = Module["_wr_viewport_set_polygon_mode"] = Module["asm"]["Qf"]).apply(null, arguments)
}
;
var _wr_viewport_set_visibility_mask = Module["_wr_viewport_set_visibility_mask"] = function() {
    return (_wr_viewport_set_visibility_mask = Module["_wr_viewport_set_visibility_mask"] = Module["asm"]["Rf"]).apply(null, arguments)
}
;
var _wr_viewport_set_size = Module["_wr_viewport_set_size"] = function() {
    return (_wr_viewport_set_size = Module["_wr_viewport_set_size"] = Module["asm"]["Sf"]).apply(null, arguments)
}
;
var _wr_viewport_set_pixel_ratio = Module["_wr_viewport_set_pixel_ratio"] = function() {
    return (_wr_viewport_set_pixel_ratio = Module["_wr_viewport_set_pixel_ratio"] = Module["asm"]["Tf"]).apply(null, arguments)
}
;
var _wr_viewport_set_camera = Module["_wr_viewport_set_camera"] = function() {
    return (_wr_viewport_set_camera = Module["_wr_viewport_set_camera"] = Module["asm"]["Uf"]).apply(null, arguments)
}
;
var _wr_viewport_set_frame_buffer = Module["_wr_viewport_set_frame_buffer"] = function() {
    return (_wr_viewport_set_frame_buffer = Module["_wr_viewport_set_frame_buffer"] = Module["asm"]["Vf"]).apply(null, arguments)
}
;
var _wr_viewport_enable_shadows = Module["_wr_viewport_enable_shadows"] = function() {
    return (_wr_viewport_enable_shadows = Module["_wr_viewport_enable_shadows"] = Module["asm"]["Wf"]).apply(null, arguments)
}
;
var _wr_viewport_enable_skybox = Module["_wr_viewport_enable_skybox"] = function() {
    return (_wr_viewport_enable_skybox = Module["_wr_viewport_enable_skybox"] = Module["asm"]["Xf"]).apply(null, arguments)
}
;
var _wr_viewport_sync_aspect_ratio_with_camera = Module["_wr_viewport_sync_aspect_ratio_with_camera"] = function() {
    return (_wr_viewport_sync_aspect_ratio_with_camera = Module["_wr_viewport_sync_aspect_ratio_with_camera"] = Module["asm"]["Yf"]).apply(null, arguments)
}
;
var _wr_viewport_attach_overlay = Module["_wr_viewport_attach_overlay"] = function() {
    return (_wr_viewport_attach_overlay = Module["_wr_viewport_attach_overlay"] = Module["asm"]["Zf"]).apply(null, arguments)
}
;
var _wr_viewport_detach_overlay = Module["_wr_viewport_detach_overlay"] = function() {
    return (_wr_viewport_detach_overlay = Module["_wr_viewport_detach_overlay"] = Module["asm"]["_f"]).apply(null, arguments)
}
;
var _wr_viewport_render_overlay = Module["_wr_viewport_render_overlay"] = function() {
    return (_wr_viewport_render_overlay = Module["_wr_viewport_render_overlay"] = Module["asm"]["$f"]).apply(null, arguments)
}
;
var _wr_viewport_render_overlays = Module["_wr_viewport_render_overlays"] = function() {
    return (_wr_viewport_render_overlays = Module["_wr_viewport_render_overlays"] = Module["asm"]["ag"]).apply(null, arguments)
}
;
var _wr_viewport_add_post_processing_effect = Module["_wr_viewport_add_post_processing_effect"] = function() {
    return (_wr_viewport_add_post_processing_effect = Module["_wr_viewport_add_post_processing_effect"] = Module["asm"]["bg"]).apply(null, arguments)
}
;
var _wr_viewport_remove_post_processing_effect = Module["_wr_viewport_remove_post_processing_effect"] = function() {
    return (_wr_viewport_remove_post_processing_effect = Module["_wr_viewport_remove_post_processing_effect"] = Module["asm"]["cg"]).apply(null, arguments)
}
;
var _wr_viewport_set_ambient_occlusion_effect = Module["_wr_viewport_set_ambient_occlusion_effect"] = function() {
    return (_wr_viewport_set_ambient_occlusion_effect = Module["_wr_viewport_set_ambient_occlusion_effect"] = Module["asm"]["dg"]).apply(null, arguments)
}
;
var _wr_viewport_set_anti_aliasing_effect = Module["_wr_viewport_set_anti_aliasing_effect"] = function() {
    return (_wr_viewport_set_anti_aliasing_effect = Module["_wr_viewport_set_anti_aliasing_effect"] = Module["asm"]["eg"]).apply(null, arguments)
}
;
var _wr_viewport_get_width = Module["_wr_viewport_get_width"] = function() {
    return (_wr_viewport_get_width = Module["_wr_viewport_get_width"] = Module["asm"]["fg"]).apply(null, arguments)
}
;
var _wr_viewport_get_height = Module["_wr_viewport_get_height"] = function() {
    return (_wr_viewport_get_height = Module["_wr_viewport_get_height"] = Module["asm"]["gg"]).apply(null, arguments)
}
;
var _wr_viewport_get_camera = Module["_wr_viewport_get_camera"] = function() {
    return (_wr_viewport_get_camera = Module["_wr_viewport_get_camera"] = Module["asm"]["hg"]).apply(null, arguments)
}
;
var _wr_viewport_get_frame_buffer = Module["_wr_viewport_get_frame_buffer"] = function() {
    return (_wr_viewport_get_frame_buffer = Module["_wr_viewport_get_frame_buffer"] = Module["asm"]["ig"]).apply(null, arguments)
}
;
var _wr_texture_transform_new = Module["_wr_texture_transform_new"] = function() {
    return (_wr_texture_transform_new = Module["_wr_texture_transform_new"] = Module["asm"]["jg"]).apply(null, arguments)
}
;
var _wr_texture_transform_delete = Module["_wr_texture_transform_delete"] = function() {
    return (_wr_texture_transform_delete = Module["_wr_texture_transform_delete"] = Module["asm"]["kg"]).apply(null, arguments)
}
;
var _wr_texture_transform_set_center = Module["_wr_texture_transform_set_center"] = function() {
    return (_wr_texture_transform_set_center = Module["_wr_texture_transform_set_center"] = Module["asm"]["lg"]).apply(null, arguments)
}
;
var _wr_texture_transform_set_position = Module["_wr_texture_transform_set_position"] = function() {
    return (_wr_texture_transform_set_position = Module["_wr_texture_transform_set_position"] = Module["asm"]["mg"]).apply(null, arguments)
}
;
var _wr_texture_transform_set_rotation = Module["_wr_texture_transform_set_rotation"] = function() {
    return (_wr_texture_transform_set_rotation = Module["_wr_texture_transform_set_rotation"] = Module["asm"]["ng"]).apply(null, arguments)
}
;
var _wr_texture_transform_set_scale = Module["_wr_texture_transform_set_scale"] = function() {
    return (_wr_texture_transform_set_scale = Module["_wr_texture_transform_set_scale"] = Module["asm"]["og"]).apply(null, arguments)
}
;
var _wr_texture_transform_apply_to_uv_coordinate = Module["_wr_texture_transform_apply_to_uv_coordinate"] = function() {
    return (_wr_texture_transform_apply_to_uv_coordinate = Module["_wr_texture_transform_apply_to_uv_coordinate"] = Module["asm"]["pg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_new = Module["_wr_frame_buffer_new"] = function() {
    return (_wr_frame_buffer_new = Module["_wr_frame_buffer_new"] = Module["asm"]["qg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_delete = Module["_wr_frame_buffer_delete"] = function() {
    return (_wr_frame_buffer_delete = Module["_wr_frame_buffer_delete"] = Module["asm"]["rg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_append_output_texture = Module["_wr_frame_buffer_append_output_texture"] = function() {
    return (_wr_frame_buffer_append_output_texture = Module["_wr_frame_buffer_append_output_texture"] = Module["asm"]["sg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_append_output_texture_disable = Module["_wr_frame_buffer_append_output_texture_disable"] = function() {
    return (_wr_frame_buffer_append_output_texture_disable = Module["_wr_frame_buffer_append_output_texture_disable"] = Module["asm"]["tg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_set_depth_texture = Module["_wr_frame_buffer_set_depth_texture"] = function() {
    return (_wr_frame_buffer_set_depth_texture = Module["_wr_frame_buffer_set_depth_texture"] = Module["asm"]["ug"]).apply(null, arguments)
}
;
var _wr_frame_buffer_enable_depth_buffer = Module["_wr_frame_buffer_enable_depth_buffer"] = function() {
    return (_wr_frame_buffer_enable_depth_buffer = Module["_wr_frame_buffer_enable_depth_buffer"] = Module["asm"]["vg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_enable_copying = Module["_wr_frame_buffer_enable_copying"] = function() {
    return (_wr_frame_buffer_enable_copying = Module["_wr_frame_buffer_enable_copying"] = Module["asm"]["wg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_set_size = Module["_wr_frame_buffer_set_size"] = function() {
    return (_wr_frame_buffer_set_size = Module["_wr_frame_buffer_set_size"] = Module["asm"]["xg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_get_output_texture = Module["_wr_frame_buffer_get_output_texture"] = function() {
    return (_wr_frame_buffer_get_output_texture = Module["_wr_frame_buffer_get_output_texture"] = Module["asm"]["yg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_get_depth_texture = Module["_wr_frame_buffer_get_depth_texture"] = function() {
    return (_wr_frame_buffer_get_depth_texture = Module["_wr_frame_buffer_get_depth_texture"] = Module["asm"]["zg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_setup = Module["_wr_frame_buffer_setup"] = function() {
    return (_wr_frame_buffer_setup = Module["_wr_frame_buffer_setup"] = Module["asm"]["Ag"]).apply(null, arguments)
}
;
var _wr_frame_buffer_blit_to_screen = Module["_wr_frame_buffer_blit_to_screen"] = function() {
    return (_wr_frame_buffer_blit_to_screen = Module["_wr_frame_buffer_blit_to_screen"] = Module["asm"]["Bg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_copy_contents = Module["_wr_frame_buffer_copy_contents"] = function() {
    return (_wr_frame_buffer_copy_contents = Module["_wr_frame_buffer_copy_contents"] = Module["asm"]["Cg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_copy_pixel = Module["_wr_frame_buffer_copy_pixel"] = function() {
    return (_wr_frame_buffer_copy_pixel = Module["_wr_frame_buffer_copy_pixel"] = Module["asm"]["Dg"]).apply(null, arguments)
}
;
var _wr_frame_buffer_copy_depth_pixel = Module["_wr_frame_buffer_copy_depth_pixel"] = function() {
    return (_wr_frame_buffer_copy_depth_pixel = Module["_wr_frame_buffer_copy_depth_pixel"] = Module["asm"]["Eg"]).apply(null, arguments)
}
;
var _wr_pbr_material_new = Module["_wr_pbr_material_new"] = function() {
    return (_wr_pbr_material_new = Module["_wr_pbr_material_new"] = Module["asm"]["Fg"]).apply(null, arguments)
}
;
var _wr_pbr_material_clear = Module["_wr_pbr_material_clear"] = function() {
    return (_wr_pbr_material_clear = Module["_wr_pbr_material_clear"] = Module["asm"]["Gg"]).apply(null, arguments)
}
;
var _wr_pbr_material_set_transparency = Module["_wr_pbr_material_set_transparency"] = function() {
    return (_wr_pbr_material_set_transparency = Module["_wr_pbr_material_set_transparency"] = Module["asm"]["Hg"]).apply(null, arguments)
}
;
var _wr_pbr_material_set_background_color = Module["_wr_pbr_material_set_background_color"] = function() {
    return (_wr_pbr_material_set_background_color = Module["_wr_pbr_material_set_background_color"] = Module["asm"]["Ig"]).apply(null, arguments)
}
;
var _wr_pbr_material_set_base_color = Module["_wr_pbr_material_set_base_color"] = function() {
    return (_wr_pbr_material_set_base_color = Module["_wr_pbr_material_set_base_color"] = Module["asm"]["Jg"]).apply(null, arguments)
}
;
var _wr_pbr_material_set_emissive_color = Module["_wr_pbr_material_set_emissive_color"] = function() {
    return (_wr_pbr_material_set_emissive_color = Module["_wr_pbr_material_set_emissive_color"] = Module["asm"]["Kg"]).apply(null, arguments)
}
;
var _wr_pbr_material_set_roughness = Module["_wr_pbr_material_set_roughness"] = function() {
    return (_wr_pbr_material_set_roughness = Module["_wr_pbr_material_set_roughness"] = Module["asm"]["Lg"]).apply(null, arguments)
}
;
var _wr_pbr_material_set_metalness = Module["_wr_pbr_material_set_metalness"] = function() {
    return (_wr_pbr_material_set_metalness = Module["_wr_pbr_material_set_metalness"] = Module["asm"]["Mg"]).apply(null, arguments)
}
;
var _wr_pbr_material_set_ibl_strength = Module["_wr_pbr_material_set_ibl_strength"] = function() {
    return (_wr_pbr_material_set_ibl_strength = Module["_wr_pbr_material_set_ibl_strength"] = Module["asm"]["Ng"]).apply(null, arguments)
}
;
var _wr_pbr_material_set_normal_map_strength = Module["_wr_pbr_material_set_normal_map_strength"] = function() {
    return (_wr_pbr_material_set_normal_map_strength = Module["_wr_pbr_material_set_normal_map_strength"] = Module["asm"]["Og"]).apply(null, arguments)
}
;
var _wr_pbr_material_set_occlusion_map_strength = Module["_wr_pbr_material_set_occlusion_map_strength"] = function() {
    return (_wr_pbr_material_set_occlusion_map_strength = Module["_wr_pbr_material_set_occlusion_map_strength"] = Module["asm"]["Pg"]).apply(null, arguments)
}
;
var _wr_pbr_material_set_emissive_intensity = Module["_wr_pbr_material_set_emissive_intensity"] = function() {
    return (_wr_pbr_material_set_emissive_intensity = Module["_wr_pbr_material_set_emissive_intensity"] = Module["asm"]["Qg"]).apply(null, arguments)
}
;
var _wr_pbr_material_set_all_parameters = Module["_wr_pbr_material_set_all_parameters"] = function() {
    return (_wr_pbr_material_set_all_parameters = Module["_wr_pbr_material_set_all_parameters"] = Module["asm"]["Rg"]).apply(null, arguments)
}
;
var _wr_pbr_material_is_translucent = Module["_wr_pbr_material_is_translucent"] = function() {
    return (_wr_pbr_material_is_translucent = Module["_wr_pbr_material_is_translucent"] = Module["asm"]["Sg"]).apply(null, arguments)
}
;
var _wr_dynamic_mesh_new = Module["_wr_dynamic_mesh_new"] = function() {
    return (_wr_dynamic_mesh_new = Module["_wr_dynamic_mesh_new"] = Module["asm"]["Tg"]).apply(null, arguments)
}
;
var _wr_dynamic_mesh_delete = Module["_wr_dynamic_mesh_delete"] = function() {
    return (_wr_dynamic_mesh_delete = Module["_wr_dynamic_mesh_delete"] = Module["asm"]["Ug"]).apply(null, arguments)
}
;
var _wr_dynamic_mesh_clear = Module["_wr_dynamic_mesh_clear"] = function() {
    return (_wr_dynamic_mesh_clear = Module["_wr_dynamic_mesh_clear"] = Module["asm"]["Vg"]).apply(null, arguments)
}
;
var _wr_dynamic_mesh_clear_selected = Module["_wr_dynamic_mesh_clear_selected"] = function() {
    return (_wr_dynamic_mesh_clear_selected = Module["_wr_dynamic_mesh_clear_selected"] = Module["asm"]["Wg"]).apply(null, arguments)
}
;
var _wr_dynamic_mesh_add_vertex = Module["_wr_dynamic_mesh_add_vertex"] = function() {
    return (_wr_dynamic_mesh_add_vertex = Module["_wr_dynamic_mesh_add_vertex"] = Module["asm"]["Xg"]).apply(null, arguments)
}
;
var _wr_dynamic_mesh_add_normal = Module["_wr_dynamic_mesh_add_normal"] = function() {
    return (_wr_dynamic_mesh_add_normal = Module["_wr_dynamic_mesh_add_normal"] = Module["asm"]["Yg"]).apply(null, arguments)
}
;
var _wr_dynamic_mesh_add_texture_coordinate = Module["_wr_dynamic_mesh_add_texture_coordinate"] = function() {
    return (_wr_dynamic_mesh_add_texture_coordinate = Module["_wr_dynamic_mesh_add_texture_coordinate"] = Module["asm"]["Zg"]).apply(null, arguments)
}
;
var _wr_dynamic_mesh_add_index = Module["_wr_dynamic_mesh_add_index"] = function() {
    return (_wr_dynamic_mesh_add_index = Module["_wr_dynamic_mesh_add_index"] = Module["asm"]["_g"]).apply(null, arguments)
}
;
var _wr_dynamic_mesh_add_color = Module["_wr_dynamic_mesh_add_color"] = function() {
    return (_wr_dynamic_mesh_add_color = Module["_wr_dynamic_mesh_add_color"] = Module["asm"]["$g"]).apply(null, arguments)
}
;
var _wrjs_array3 = Module["_wrjs_array3"] = function() {
    return (_wrjs_array3 = Module["_wrjs_array3"] = Module["asm"]["ah"]).apply(null, arguments)
}
;
var _wrjs_array4 = Module["_wrjs_array4"] = function() {
    return (_wrjs_array4 = Module["_wrjs_array4"] = Module["asm"]["bh"]).apply(null, arguments)
}
;
var _wrjs_pointerOnFloat = Module["_wrjs_pointerOnFloat"] = function() {
    return (_wrjs_pointerOnFloat = Module["_wrjs_pointerOnFloat"] = Module["asm"]["ch"]).apply(null, arguments)
}
;
var _wrjs_pointerOnInt = Module["_wrjs_pointerOnInt"] = function() {
    return (_wrjs_pointerOnInt = Module["_wrjs_pointerOnInt"] = Module["asm"]["dh"]).apply(null, arguments)
}
;
var _wrjs_pointerOnIntBis = Module["_wrjs_pointerOnIntBis"] = function() {
    return (_wrjs_pointerOnIntBis = Module["_wrjs_pointerOnIntBis"] = Module["asm"]["eh"]).apply(null, arguments)
}
;
var _wrjs_init_context = Module["_wrjs_init_context"] = function() {
    return (_wrjs_init_context = Module["_wrjs_init_context"] = Module["asm"]["fh"]).apply(null, arguments)
}
;
var _wrjs_exit = Module["_wrjs_exit"] = function() {
    return (_wrjs_exit = Module["_wrjs_exit"] = Module["asm"]["gh"]).apply(null, arguments)
}
;
var ___errno_location = Module["___errno_location"] = function() {
    return (___errno_location = Module["___errno_location"] = Module["asm"]["hh"]).apply(null, arguments)
}
;
var _free = Module["_free"] = function() {
    return (_free = Module["_free"] = Module["asm"]["ih"]).apply(null, arguments)
}
;
var _malloc = Module["_malloc"] = function() {
    return (_malloc = Module["_malloc"] = Module["asm"]["jh"]).apply(null, arguments)
}
;
var stackSave = Module["stackSave"] = function() {
    return (stackSave = Module["stackSave"] = Module["asm"]["kh"]).apply(null, arguments)
}
;
var stackRestore = Module["stackRestore"] = function() {
    return (stackRestore = Module["stackRestore"] = Module["asm"]["lh"]).apply(null, arguments)
}
;
var stackAlloc = Module["stackAlloc"] = function() {
    return (stackAlloc = Module["stackAlloc"] = Module["asm"]["mh"]).apply(null, arguments)
}
;
Module["ccall"] = ccall;
Module["getValue"] = getValue;
Module["addRunDependency"] = addRunDependency;
Module["removeRunDependency"] = removeRunDependency;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createDevice"] = FS.createDevice;
Module["FS_unlink"] = FS.unlink;
var calledRun;
function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status
}
dependenciesFulfilled = function runCaller() {
    if (!calledRun)
        run();
    if (!calledRun)
        dependenciesFulfilled = runCaller
}
;
function run(args) {
    args = args || arguments_;
    if (runDependencies > 0) {
        return
    }
    preRun();
    if (runDependencies > 0) {
        return
    }
    function doRun() {
        if (calledRun)
            return;
        calledRun = true;
        Module["calledRun"] = true;
        if (ABORT)
            return;
        initRuntime();
        if (Module["onRuntimeInitialized"])
            Module["onRuntimeInitialized"]();
        postRun()
    }
    if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout(function() {
            setTimeout(function() {
                Module["setStatus"]("")
            }, 1);
            doRun()
        }, 1)
    } else {
        doRun()
    }
}
Module["run"] = run;
function exit(status, implicit) {
    EXITSTATUS = status;
    if (implicit && keepRuntimeAlive() && status === 0) {
        return
    }
    if (keepRuntimeAlive()) {} else {
        exitRuntime();
        if (Module["onExit"])
            Module["onExit"](status);
        ABORT = true
    }
    quit_(status, new ExitStatus(status))
}
if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function")
        Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
        Module["preInit"].pop()()
    }
}
run();
