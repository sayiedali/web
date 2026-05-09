"use client";
import { useEffect, useState } from "react";
import { Select, Input } from "antd";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CommonButton from "@/app/_components/_common-button/CommonButton";
import { useSelector } from "react-redux";
import { InfinitySpin } from "react-loader-spinner";
import apiUrl from "@/app/_host/apiURL";

const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;
const { Option } = Select;

const TwoForOnePizzasForm = () => {
  const data = useSelector((state) => state);
  const [branch, setBranch] = useState(
    data.userData.userInfo && data.userData.userInfo.branchName,
  );
  const [updateButton, setUpdateButton] = useState(false);
  let [dataReFatch, setDataReFatch] = useState(false);
  
  const [twoForOnePizzasData, setTwoForOnePizzasData] = useState({
    name: "",
    prices: {
      small: "",
      medium: "",
      large: "",
      extralarge: "",
    },
    size: {
      small: "",
      medium: "",
      large: "",
      extralarge: "",
    },

    branch: data.userData.userInfo && data.userData.userInfo.branchName,
  });
  
  let [edit, setEdit] = useState(false);
  let [editID, setEditID] = useState("");
  let [editItem, setEditItem] = useState();
  

  const handleChange = (value, field) => {
    setUpdateButton(true);
    setTwoForOnePizzasData({ ...twoForOnePizzasData, [field]: value });
  };

  const handlePriceChange = (value, size) => {
    setUpdateButton(true);
    setTwoForOnePizzasData({
      ...twoForOnePizzasData,
      prices: {
        ...twoForOnePizzasData.prices,
        [size]: value,
      },
    });
  };

  const handleSizeChange = (value, size) => {
    setUpdateButton(true);
    setTwoForOnePizzasData({
      ...twoForOnePizzasData,
      size: {
        ...twoForOnePizzasData.size,
        [size]: value,
      },
    });
  };

  const handleSubmit = () => {
    axios
      .post(`${apiUrl}/api/v1/add-menu/twoforonepizza`, twoForOnePizzasData, {
        auth: { username: "user", password: postToken },
      })
      .then((res) => {
        if (
          res.data.message ===
          "Your Two-for-One Pizza Item Successfully Created!!"
        ) {
          toast.success(res.data.message);

          setTwoForOnePizzasData({
            name: "",
            prices: {
              small: "",
              medium: "",
              large: "",
              extralarge: "",
            },
            size: {
              small: "",
              medium: "",
              large: "",
              extralarge: "",
            },
            branch: data.userData.userInfo && data.userData.userInfo.branchName,
          });

          setDataReFatch(!dataReFatch);
        } else {
          toast.error(res.data.message);
        }
      })
      .catch((error) => {
        toast.error("Error adding pizza. Please try again.");
      });
  };

  const handleDelete = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/deletetwoforonepizza`,
        {
          id: _id,
        },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        toast.success("Item Successfully Deleted!");
        setDataReFatch(!dataReFatch);
      })
      .catch((error) => {
        toast.error("Error deleting two for one pizza. Please try again.");
      });
  };

  const handleUpdate = () => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/updatetwoforonepizza`,
        {
          id: editID,
          updatedTwoForOnePizza: twoForOnePizzasData,
        },
        { auth: { username: "user", password: postToken } },
      )
      .then((res) => {
        if (
          res.data.message ===
          "Your Two-for-One Pizza Item Successfully Updated!!"
        ) {
          toast.success(res.data.message);

          setTwoForOnePizzasData({
            name: "",
            prices: {
              small: "",
              medium: "",
              large: "",
              extralarge: "",
            },
            size: {
              small: "",
              medium: "",
              large: "",
              extralarge: "",
            },
            branch: data.userData.userInfo && data.userData.userInfo.branchName,
          });

          setUpdateButton(false);
          setEdit(false);
          setEditID("");
          
          setDataReFatch(!dataReFatch);
        } else {
          toast.error(res.data.message);
        }
      })
      .catch((error) => {
        toast.error("Error updating two for one pizza. Please try again.");
      });
  };

  const handleNotAvailable = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/twoforonepizzastatus`,
        {
          id: _id,
          status: "not-available",
        },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        setDataReFatch(!dataReFatch);
      })
      .catch((error) => {
        toast.error(
          "Error updating two for one pizza status. Please try again.",
        );
      });
  };

  const handleAvailable = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/twoforonepizzastatus`,
        {
          id: _id,
          status: "available",
        },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        setDataReFatch(!dataReFatch);
      })
      .catch((error) => {
        toast.error(
          "Error updating two for one pizza status. Please try again.",
        );
      });
  };

  let [allTwoForOnePizzas, setAllTwoForOnePizzas] = useState([]);
  useEffect(() => {
    axios
      .get(`${apiUrl}/api/v1/add-menu/gettwoforonepizza`, {
        auth: {
          username: "user",
          password: getToken,
        },
      })
      .then((res) => {
        setAllTwoForOnePizzas(res.data);
      });
  }, [dataReFatch]);

  const formatDateTime = (createdAt) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return new Date(createdAt).toLocaleDateString(undefined, options);
  };

  //   get all pizza names
  let [allPizzasNames, setAllPizzasNames] = useState([]);
  useEffect(() => {
    axios
      .get(`${apiUrl}/api/v1/add-menu/getpizza`, {
        auth: {
          username: "user",
          password: getToken,
        },
      })
      .then((res) => {
        setAllPizzasNames(res.data);
      });
  }, [dataReFatch]);


  const handleEdit = (item, index) => {
    setUpdateButton(false);
    setEdit(true);
    setEditID(item._id);
    setEditItem(item);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTwoForOnePizzasData({
      name: item.name,
      prices: {
        small: item.prices.small,
        medium: item.prices.medium,
        large: item.prices.large,
        extralarge: item.prices.extralarge,
      },
      size: {
        small: item?.size?.small || "",
        medium: item?.size?.medium || "",
        large: item?.size?.large || "",
        extralarge: item?.size?.extralarge || "",
      },
      branch: data.userData.userInfo && data.userData.userInfo.branchName,
    });
  };

  const handleCancelEdit = () => {
    setUpdateButton(false);
    setEdit(false);
    setEditID("");
    setEditItem("");
    setTwoForOnePizzasData({
      name: "",
      prices: {
        small: "",
        medium: "",
        large: "",
        extralarge: "",
      },
      size: {
        small: "",
        medium: "",
        large: "",
        extralarge: "",
      },

      branch: data.userData.userInfo && data.userData.userInfo.branchName,
    });
  };

  return (
    <div className="flex flex-col w-full gap-5 mx-auto mt-10">
      {editItem ? (
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Update your two for one pizza item - {editItem.name}
        </h3>
      ) : (
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Add your two for one pizza items
        </h3>
      )}
      <p className="text-p-red">Select Pizza Name</p>
      <Select
        defaultValue="Select Pizza Name"
        className="!w-full"
        value={twoForOnePizzasData.name}
        onChange={(value) => handleChange(value, "name")}
        options={allPizzasNames
          .filter((item) => item.branch === branch) // Filter out items not matching the branch
          .map((item) => ({
            value: item.name,
            label: item.name,
          }))}
      />
      <p className="text-p-red">Add Prices (CAD)</p>

      <div className="flex w-full gap-5">
        <div className="flex flex-col w-full gap-2">
          <Input
            placeholder="Small Pizza Price"
            type="number"
            value={twoForOnePizzasData.prices.small}
            onChange={(e) => handlePriceChange(e.target.value, "small")}
          />

          <Input
            placeholder="Small Pizza Size"
            type="text"
            value={twoForOnePizzasData.size.small}
            onChange={(e) => handleSizeChange(e.target.value, "small")}
          />
        </div>

        <div className="flex flex-col w-full gap-2">
          <Input
            placeholder="Medium Pizza Price"
            type="number"
            value={twoForOnePizzasData.prices.medium}
            onChange={(e) => handlePriceChange(e.target.value, "medium")}
          />

          <Input
            placeholder="Medium Pizza Size"
            type="text"
            value={twoForOnePizzasData.size.medium}
            onChange={(e) => handleSizeChange(e.target.value, "medium")}
          />
        </div>

        <div className="flex flex-col w-full gap-2">
          <Input
            placeholder="Large Pizza Price"
            type="number"
            value={twoForOnePizzasData.prices.large}
            onChange={(e) => handlePriceChange(e.target.value, "large")}
          />

          <Input
            placeholder="Large Pizza Size"
            type="text"
            value={twoForOnePizzasData.size.large}
            onChange={(e) => handleSizeChange(e.target.value, "large")}
          />
        </div>

        <div className="flex flex-col w-full gap-2">
          <Input
            placeholder="Extra Large Pizza Price"
            type="number"
            value={twoForOnePizzasData.prices.extralarge}
            onChange={(e) => handlePriceChange(e.target.value, "extralarge")}
          />

          <Input
            placeholder="Extra Large Pizza Size"
            type="text"
            value={twoForOnePizzasData.size.extralarge}
            onChange={(e) => handleSizeChange(e.target.value, "extralarge")}
          />
        </div>

        {/*       
        <Input
          placeholder="Small Pizza Price"
          type="number"
          className="w-[49%]"
          value={twoForOnePizzasData.prices.small}
          onChange={(e) => handlePriceChange(e.target.value, "small")}
        />
        <Input
          placeholder="Medium Pizza Price"
          type="number"
          className="w-[49%]"
          value={twoForOnePizzasData.prices.medium}
          onChange={(e) => handlePriceChange(e.target.value, "medium")}
        />
        <Input
          placeholder="Large Pizza Price"
          type="number"
          className="w-[49%]"
          value={twoForOnePizzasData.prices.large}
          onChange={(e) => handlePriceChange(e.target.value, "large")}
        />
        <Input
          placeholder="Extra Large Pizza Price"
          type="number"
          className="w-[49%]"
          value={twoForOnePizzasData.prices.extralarge}
          onChange={(e) => handlePriceChange(e.target.value, "extralarge")}
        /> */}
      </div>

      <div className="flex justify-center">
        {edit ? (
          <div className="flex gap-3">
            {updateButton && (
              <CommonButton title={"Update"} onClick={handleUpdate} />
            )}
            <CommonButton title={"Cancel Edit"} onClick={handleCancelEdit} />
          </div>
        ) : (
          <CommonButton title={"Submit"} onClick={handleSubmit} />
        )}
      </div>
      <div className="w-full mt-10">
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          manage your all two for one pizza items from here
        </h3>
        <div className="flex flex-col-reverse flex-wrap justify-center w-full gap-5 mt-5 md:flex-row">
          {allTwoForOnePizzas.map(
            (item, index) =>
              item.branch === branch && (
                <div
                  key={index}
                  className="w-full p-3 md:w-[32%] bg-p-yellow flex flex-col gap-y-3"
                >
                  <h4 className="text-[20px] text-p-red mt-3 font-semibold capitalize ">
                    {item.name}
                  </h4>
                  <div className="">
                    <h4 className="text-[17px]  text-p-red font-semibold capitalize ">
                      Prices (CAD)
                    </h4>
                    <ul>
                      <li className="text-p-brown">
                        <span className="font-semibold">
                          Small {item?.size?.small}:
                        </span>{" "}
                        {item.prices.small}
                      </li>
                      <li className="text-p-brown">
                        <span className="font-semibold">
                          Medium {item?.size?.medium}:
                        </span>{" "}
                        {item.prices.medium}
                      </li>
                      <li className="text-p-brown">
                        <span className="font-semibold">
                          Large {item?.size?.large}:
                        </span>{" "}
                        {item.prices.large}
                      </li>
                      <li className="text-p-brown">
                        <span className="font-semibold">
                          Extra Large {item?.size?.extralarge}:
                        </span>{" "}
                        {item.prices.extralarge}
                      </li>
                    </ul>
                  </div>
                  <div className="text-end">
                    <small className="font-semibold text-p-brown">
                      Created: {formatDateTime(item.createdAt)}
                    </small>
                    <br />
                    <small className="font-semibold text-p-brown">
                      Last Update: {formatDateTime(item.updatedAt)}
                    </small>
                  </div>
                  <div className="flex justify-center gap-3 mt-5">
                    {edit && item._id === editID ? (
                      <InfinitySpin
                        visible={true}
                        width="200"
                        color="#005B89"
                        ariaLabel="infinity-spin-loading"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <div
                          onClick={() => handleEdit(item, index)}
                          className="p-2 rounded-xl text-white cursor-pointer duration-300 hover:opacity-[0.7] bg-green-700"
                        >
                          Edit
                        </div>
                        <div
                          onClick={() => handleDelete(item._id)}
                          className="p-2 rounded-xl text-white cursor-pointer duration-300 hover:opacity-[0.7] bg-red-500"
                        >
                          Delete
                        </div>
                        {item.isAvailable === "not-available" ? (
                          <div
                            onClick={() => handleAvailable(item._id)}
                            className="p-2 rounded-xl text-white cursor-pointer duration-300 hover:opacity-[0.7] bg-p-blue"
                          >
                            Available
                          </div>
                        ) : (
                          <div
                            onClick={() => handleNotAvailable(item._id)}
                            className="p-2 rounded-xl text-white cursor-pointer duration-300 hover:opacity-[0.7] bg-p-red"
                          >
                            Not Available
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ),
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoForOnePizzasForm;
