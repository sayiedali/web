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
import useToppingsOptions from "@/app/dashboard/add-menu/_hooks/useToppingsOptions";

const { Option } = Select;
const postToken = process.env.NEXT_PUBLIC_API_POST_TOKEN;
const getToken = process.env.NEXT_PUBLIC_API_GET_TOKEN;
const parseApiError = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const parseNumberish = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const defaultPizzaForm = (branch) => ({
  name: "",
  description: "",
  image: "",
  branch,
  toppings: [],
  defaultToppings: [],
  allowedExtraToppings: [],
  sauces: [],
  crusts: [],
  cheeseOptions: [],
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
  pizzaType: "preset",
  merchandising: {
    searchable: true,
    popular: false,
    dealEligible: false,
  },
  campaignTags: [],
});

const sauceOptions = [
  "Tomato Sauce",
  "BBQ",
  "Alfredo",
  "Pesto",
  "Garlic Butter",
];
const crustOptions = ["Regular", "Thin", "Thick", "Pan", "Stuffed"];
const cheeseOptions = [
  "Mozzarella",
  "Cheddar",
  "Feta",
  "Parmesan",
  "Vegan Cheese",
];

const PizzaForm = () => {
  const data = useSelector((state) => state);
  const branch = data.userData.userInfo && data.userData.userInfo.branchName;

  const [updateButton, setUpdateButton] = useState(false);
  const [edit, setEdit] = useState(false);
  const [editID, setEditID] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [dataReFatch, setDataReFatch] = useState(false);

  const [imageBase64Data, setImageBase64Data] = useState("");
  const [pizzaData, setPizzaData] = useState(defaultPizzaForm(branch));
  const [allPizza, setAllPizza] = useState([]);
  const fallbackToppings = [
    "HAM",
    "SALAMI",
    "PEPPERONI",
    "BACON",
    "GROUND BEEF",
    "SAUSAGE",
    "EXTRA CHEESE",
    "FETA CHEESE",
    "ROASTED GARLIC",
    "CHEDDAR",
    "PINEAPPLE",
    "GREEN PEPPERS",
    "FRESH TOMATOES",
    "COOKED TOMATOES",
    "HOT BANANA PEPPERS",
    "ONIONS",
    "RED ONIONS",
    "BLACK OLIVES",
    "GREEN OLIVES",
    "MUSHROOM",
    "SPINACH",
    "JALAPENO",
    "SHRIMP",
    "CRAB",
    "CHICKEN",
    "DONAIR MEAT",
    "BBQ SAUCE",
    "CHICKEN BREAST",
    "SWEET SAUCE",
    "WHITE SAUCE",
    "HOT SAUCE",
    "SALSA SAUCE BASE",
    "SUN DRIED TOMATOES",
    "SOUR CREAM",
    "BLUE CHEESE",
    "GARLIC BUTTER BASE",
    "PESTO SAUCE BASE",
  ];

  const {
    toppingsOptions: selectableToppings,
    loadingToppings,
    refreshToppings,
  } = useToppingsOptions({
    branch,
    fallback: fallbackToppings,
  });

  const extraToppingOptions = selectableToppings.filter(
    (item) => !pizzaData.defaultToppings.includes(item),
  );

  const setField = (field, value) => {
    setUpdateButton(true);
    setPizzaData((prev) => {
      if (field === "defaultToppings") {
        const normalizedDefaults = Array.isArray(value) ? value : [];
        return {
          ...prev,
          defaultToppings: normalizedDefaults,
          allowedExtraToppings: (prev.allowedExtraToppings || []).filter(
            (item) => !normalizedDefaults.includes(item),
          ),
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const setNestedField = (key, sizeKey, value) => {
    setUpdateButton(true);
    setPizzaData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [sizeKey]: value,
      },
    }));
  };

  const setMerchandisingField = (field, checked) => {
    setUpdateButton(true);
    setPizzaData((prev) => ({
      ...prev,
      merchandising: {
        ...prev.merchandising,
        [field]: checked,
      },
    }));
  };

  const resetForm = () => {
    setPizzaData(defaultPizzaForm(branch));
    setImageBase64Data("");
    setEdit(false);
    setEditID("");
    setEditItem(null);
    setUpdateButton(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageBase64Data(event.target.result);
      setUpdateButton(true);
    };
    reader.readAsDataURL(file);
  };

  const normalizePayload = () => {
    const defaultToppings = pizzaData.defaultToppings?.length
      ? pizzaData.defaultToppings
      : pizzaData.toppings;
    const payloadBranch = pizzaData.branch || branch;

    return {
      ...pizzaData,
      branch: payloadBranch,
      toppings: defaultToppings,
      defaultToppings,
      allowedExtraToppings: pizzaData.allowedExtraToppings,
      sauces: pizzaData.sauces,
      crusts: pizzaData.crusts,
      cheeseOptions: pizzaData.cheeseOptions,
      image: imageBase64Data || editItem?.image || "",
      pizzaType: pizzaData.pizzaType,
      merchandising: {
        searchable: !!pizzaData.merchandising.searchable,
        popular: !!pizzaData.merchandising.popular,
        dealEligible: !!pizzaData.merchandising.dealEligible,
      },
      campaignTags: pizzaData.campaignTags,
      prices: {
        small: parseNumberish(pizzaData?.prices?.small),
        medium: parseNumberish(pizzaData?.prices?.medium),
        large: parseNumberish(pizzaData?.prices?.large),
        extralarge: parseNumberish(pizzaData?.prices?.extralarge),
      },
      size: {
        small: parseNumberish(pizzaData?.size?.small),
        medium: parseNumberish(pizzaData?.size?.medium),
        large: parseNumberish(pizzaData?.size?.large),
        extralarge: parseNumberish(pizzaData?.size?.extralarge),
      },
    };
  };

  useEffect(() => {
    if (!branch) return;
    setPizzaData((prev) => ({
      ...prev,
      branch,
    }));
  }, [branch]);

  const handleSubmit = () => {
    axios
      .post(`${apiUrl}/api/v1/add-menu/pizza`, normalizePayload(), {
        auth: { username: "user", password: postToken },
      })
      .then((res) => {
        if (res?.data?.success === false) {
          toast.error(res?.data?.message || "Unable to create pizza item.");
          return;
        }

        toast.success(res?.data?.message || "Pizza item created.");
          resetForm();
          setDataReFatch((prev) => !prev);
      })
      .catch((error) => {
        toast.error(parseApiError(error, "Error adding pizza. Please try again."));
      });
  };

  const handleUpdate = () => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/updatepizza`,
        {
          id: editID,
          updatedPizza: normalizePayload(),
        },
        { auth: { username: "user", password: postToken } },
      )
      .then((res) => {
        if (res?.data?.success === false) {
          toast.error(res?.data?.message || "Unable to update pizza item.");
          return;
        }

        toast.success(res?.data?.message || "Pizza item updated.");
          resetForm();
          setDataReFatch((prev) => !prev);
      })
      .catch((error) => {
        toast.error(parseApiError(error, "Error updating pizza. Please try again."));
      });
  };

  const handleDelete = (_id) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/deletepizza`,
        { id: _id },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        toast.success("Item deleted successfully");
        setDataReFatch((prev) => !prev);
      })
      .catch((error) => {
        toast.error(parseApiError(error, "Unable to delete pizza item."));
      });
  };

  const setAvailability = (_id, status) => {
    axios
      .post(
        `${apiUrl}/api/v1/add-menu/pizzastatus`,
        { id: _id, status },
        { auth: { username: "user", password: postToken } },
      )
      .then(() => {
        setDataReFatch((prev) => !prev);
      })
      .catch((error) => {
        toast.error(parseApiError(error, "Unable to update pizza availability."));
      });
  };

  const handleEdit = (item) => {
    setEdit(true);
    setUpdateButton(false);
    setEditID(item._id);
    setEditItem(item);

    window.scrollTo({ top: 0, behavior: "smooth" });

    setPizzaData({
      ...defaultPizzaForm(branch),
      name: item.name || "",
      description: item.description || "",
      image: "",
      toppings: item.toppings || [],
      defaultToppings: item.defaultToppings || item.toppings || [],
      allowedExtraToppings: item.allowedExtraToppings || [],
      sauces: item.sauces || [],
      crusts: item.crusts || [],
      cheeseOptions: item.cheeseOptions || [],
      prices: {
        small: item?.prices?.small || "",
        medium: item?.prices?.medium || "",
        large: item?.prices?.large || "",
        extralarge: item?.prices?.extralarge || "",
      },
      size: {
        small: item?.size?.small || "",
        medium: item?.size?.medium || "",
        large: item?.size?.large || "",
        extralarge: item?.size?.extralarge || "",
      },
      pizzaType:
        item.pizzaType || (item.isCreateYourOwn ? "create-your-own" : "preset"),
      merchandising: {
        searchable:
          item?.merchandising?.searchable ?? item?.isSearchable ?? true,
        popular: item?.merchandising?.popular ?? item?.isPopular ?? false,
        dealEligible:
          item?.merchandising?.dealEligible ?? item?.isDealEligible ?? false,
      },
      campaignTags: item?.campaignTags || [],
    });
  };

  useEffect(() => {
    axios
      .get(`${apiUrl}/api/v1/add-menu/getpizza`, {
        auth: {
          username: "user",
          password: getToken,
        },
      })
      .then((res) => {
        setAllPizza(Array.isArray(res.data) ? res.data : []);
      })
      .catch((error) => {
        toast.error(parseApiError(error, "Unable to load pizza menu."));
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

  return (
    <div className="flex flex-col w-full gap-5 mx-auto mt-10">
      <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
        {editItem
          ? `Update pizza item - ${editItem.name}`
          : "Build pizza product"}
      </h3>

      <Input
        placeholder="Pizza Name"
        value={pizzaData.name}
        onChange={(e) => setField("name", e.target.value)}
      />

      <Input.TextArea
        placeholder="Pizza Description"
        value={pizzaData.description}
        onChange={(e) => setField("description", e.target.value)}
      />

      <Input type="file" onChange={handleFileChange} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border rounded-lg p-3">
          <p className="text-p-red mb-2">Pizza Type</p>
          <Select
            style={{ width: "100%" }}
            value={pizzaData.pizzaType}
            onChange={(value) => setField("pizzaType", value)}
            options={[
              { value: "preset", label: "Preset Pizza" },
              { value: "create-your-own", label: "Create Your Own" },
            ]}
          />
        </div>

        <div className="border rounded-lg p-3">
          <p className="text-p-red mb-2">Campaign / merchandising tags</p>
          <Select
            mode="tags"
            style={{ width: "100%" }}
            placeholder="e.g. lunch-special, family-night"
            value={pizzaData.campaignTags}
            onChange={(value) => setField("campaignTags", value)}
          />
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h4 className="text-p-red font-semibold">
            Toppings & Options Builder
          </h4>
          <button
            onClick={refreshToppings}
            className="px-3 py-1 rounded bg-p-blue text-white text-xs"
          >
            {loadingToppings ? "Refreshing..." : "Refresh toppings"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-p-brown mb-1">Default toppings</p>
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              placeholder="Select defaults from toppings master list"
              value={pizzaData.defaultToppings}
              onChange={(value) => setField("defaultToppings", value)}
            >
              {selectableToppings.map((item) => (
                <Option key={`default-${item}`} value={item}>
                  {item}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <p className="text-sm text-p-brown mb-1">Allowed extra toppings</p>
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              placeholder="Select extras from toppings master list"
              value={pizzaData.allowedExtraToppings}
              onChange={(value) => setField("allowedExtraToppings", value)}
            >
              {extraToppingOptions.map((item) => (
                <Option key={`extra-${item}`} value={item}>
                  {item}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <p className="text-sm text-p-brown mb-1">Sauces</p>
            <Select
              mode="tags"
              style={{ width: "100%" }}
              value={pizzaData.sauces}
              onChange={(value) => setField("sauces", value)}
            >
              {sauceOptions.map((item) => (
                <Option key={item} value={item}>
                  {item}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <p className="text-sm text-p-brown mb-1">Crusts</p>
            <Select
              mode="tags"
              style={{ width: "100%" }}
              value={pizzaData.crusts}
              onChange={(value) => setField("crusts", value)}
            >
              {crustOptions.map((item) => (
                <Option key={item} value={item}>
                  {item}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <p className="text-sm text-p-brown mb-1">Cheese options</p>
            <Select
              mode="tags"
              style={{ width: "100%" }}
              value={pizzaData.cheeseOptions}
              onChange={(value) => setField("cheeseOptions", value)}
            >
              {cheeseOptions.map((item) => (
                <Option key={item} value={item}>
                  {item}
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="text-p-red font-semibold mb-3">
          Visibility & Deal Flags
        </h4>
        <div className="flex flex-wrap gap-6 text-p-brown">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pizzaData.merchandising.searchable}
              onChange={(e) =>
                setMerchandisingField("searchable", e.target.checked)
              }
            />
            Searchable
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pizzaData.merchandising.popular}
              onChange={(e) =>
                setMerchandisingField("popular", e.target.checked)
              }
            />
            Popular
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pizzaData.merchandising.dealEligible}
              onChange={(e) =>
                setMerchandisingField("dealEligible", e.target.checked)
              }
            />
            Deal eligible
          </label>
        </div>
      </div>

      <p className="text-p-red">Size pricing (CAD)</p>
      <div className="flex w-full gap-5 flex-wrap md:flex-nowrap">
        <div className="flex flex-col w-full gap-2">
          <Input
            placeholder="Small Pizza Price"
            type="number"
            value={pizzaData.prices.small}
            onChange={(e) => setNestedField("prices", "small", e.target.value)}
          />
          <Input
            placeholder="Small Pizza Size"
            type="text"
            value={pizzaData.size.small}
            onChange={(e) => setNestedField("size", "small", e.target.value)}
          />
        </div>

        <div className="flex flex-col w-full gap-2">
          <Input
            placeholder="Medium Pizza Price"
            type="number"
            value={pizzaData.prices.medium}
            onChange={(e) => setNestedField("prices", "medium", e.target.value)}
          />
          <Input
            placeholder="Medium Pizza Size"
            type="text"
            value={pizzaData.size.medium}
            onChange={(e) => setNestedField("size", "medium", e.target.value)}
          />
        </div>

        <div className="flex flex-col w-full gap-2">
          <Input
            placeholder="Large Pizza Price"
            type="number"
            value={pizzaData.prices.large}
            onChange={(e) => setNestedField("prices", "large", e.target.value)}
          />
          <Input
            placeholder="Large Pizza Size"
            type="text"
            value={pizzaData.size.large}
            onChange={(e) => setNestedField("size", "large", e.target.value)}
          />
        </div>

        <div className="flex flex-col w-full gap-2">
          <Input
            placeholder="Extra Large Pizza Price"
            type="number"
            value={pizzaData.prices.extralarge}
            onChange={(e) =>
              setNestedField("prices", "extralarge", e.target.value)
            }
          />
          <Input
            placeholder="Extra Large Pizza Size"
            type="text"
            value={pizzaData.size.extralarge}
            onChange={(e) =>
              setNestedField("size", "extralarge", e.target.value)
            }
          />
        </div>
      </div>

      <div className="flex justify-center">
        {edit ? (
          <div className="flex gap-3">
            {updateButton && (
              <CommonButton title="Update" onClick={handleUpdate} />
            )}
            <CommonButton title="Cancel Edit" onClick={resetForm} />
          </div>
        ) : (
          <CommonButton title="Submit" onClick={handleSubmit} />
        )}
      </div>

      <div className="w-full mt-10">
        <h3 className="text-center uppercase font-semibold text-p-brown text-[18px] py-4">
          Manage your pizza products
        </h3>
        <div className="flex flex-col-reverse flex-wrap justify-center w-full gap-5 mt-5 md:flex-row">
          {allPizza.map(
            (item, index) =>
              item.branch === branch && (
                <div
                  key={item._id || index}
                  className="w-full p-3 md:w-[32%] bg-p-yellow flex flex-col gap-y-3"
                >
                  <img
                    src={item.image}
                    className="w-full h-auto"
                    alt={item.name}
                  />

                  <h4 className="text-[20px] text-p-red mt-3 font-semibold capitalize ">
                    {item.name}
                  </h4>
                  <p className="text-[12px] text-p-brown">{item.description}</p>

                  <p className="text-xs text-p-brown">
                    Type:{" "}
                    <span className="font-semibold uppercase">
                      {item.pizzaType || "preset"}
                    </span>
                  </p>

                  <div>
                    <h4 className="text-[17px] mb-2 text-p-red font-semibold capitalize ">
                      Default Toppings
                    </h4>
                    <ul className="flex flex-wrap gap-2">
                      {(item.defaultToppings || item.toppings || []).map(
                        (toppingName) => (
                          <li
                            key={`${item._id}-${toppingName}`}
                            className="p-1 rounded-lg text-[10px] text-white bg-green-700"
                          >
                            {toppingName}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-[17px] mb-2 text-p-red font-semibold capitalize ">
                      Allowed Extras
                    </h4>
                    <ul className="flex flex-wrap gap-2">
                      {(item.allowedExtraToppings || []).map((toppingName) => (
                        <li
                          key={`${item._id}-extra-${toppingName}`}
                          className="p-1 rounded-lg text-[10px] text-white bg-p-blue"
                        >
                          {toppingName}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-[12px] text-p-brown">
                    <p>Sauces: {(item.sauces || []).join(", ") || "N/A"}</p>
                    <p>Crusts: {(item.crusts || []).join(", ") || "N/A"}</p>
                    <p>
                      Cheese: {(item.cheeseOptions || []).join(", ") || "N/A"}
                    </p>
                  </div>

                  <div className="text-[12px] text-p-brown">
                    <p>
                      Searchable:{" "}
                      <strong>
                        {(item?.merchandising?.searchable ?? item?.isSearchable)
                          ? "Yes"
                          : "No"}
                      </strong>
                    </p>
                    <p>
                      Popular:{" "}
                      <strong>
                        {(item?.merchandising?.popular ?? item?.isPopular)
                          ? "Yes"
                          : "No"}
                      </strong>
                    </p>
                    <p>
                      Deal eligible:{" "}
                      <strong>
                        {(item?.merchandising?.dealEligible ??
                        item?.isDealEligible)
                          ? "Yes"
                          : "No"}
                      </strong>
                    </p>
                    <p>
                      Campaign Tags:{" "}
                      {(item.campaignTags || []).join(", ") || "N/A"}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[17px] text-p-red font-semibold capitalize ">
                      Prices (CAD)
                    </h4>
                    <ul>
                      <li className="text-p-brown">
                        <span className="font-semibold">
                          Small {item?.size?.small}:
                        </span>{" "}
                        {item?.prices?.small}
                      </li>
                      <li className="text-p-brown">
                        <span className="font-semibold">
                          Medium {item?.size?.medium}:
                        </span>{" "}
                        {item?.prices?.medium}
                      </li>
                      <li className="text-p-brown">
                        <span className="font-semibold">
                          Large {item?.size?.large}:
                        </span>{" "}
                        {item?.prices?.large}
                      </li>
                      <li className="text-p-brown">
                        <span className="font-semibold">
                          Extra Large {item?.size?.extralarge}:
                        </span>{" "}
                        {item?.prices?.extralarge}
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
                        visible
                        width="200"
                        color="#005B89"
                        ariaLabel="infinity-spin-loading"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <div
                          onClick={() => handleEdit(item)}
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
                            onClick={() =>
                              setAvailability(item._id, "available")
                            }
                            className="p-2 rounded-xl text-white cursor-pointer duration-300 hover:opacity-[0.7] bg-p-blue"
                          >
                            Available
                          </div>
                        ) : (
                          <div
                            onClick={() =>
                              setAvailability(item._id, "not-available")
                            }
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

export default PizzaForm;
